from __future__ import annotations

from typing import List, Dict, Any, Optional

import numpy as np
import faiss
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import AutoTokenizer, AutoModelForCausalLM
from sqlalchemy import text
import os
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from app.config import settings
from app.db import engine, ensure_tables
from app.ingest import fetch_kb_rows, build_chunks, upsert_chunks


class RAGEngine:
    def __init__(self) -> None:
        self._embedder: Optional[SentenceTransformer] = None
        self._reranker: Optional[CrossEncoder] = None
        self._tokenizer = None
        self._llm = None
        self._index = None
        self._chunk_records: List[Dict[str, Any]] = []

    def initialize(self) -> None:
        ensure_tables()
        self.load_index()
        if os.getenv("GEMINI_API_KEY") and genai:
            genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        if settings.load_on_startup:
            self._load_models()

    def _load_models(self) -> None:
        if self._embedder is None:
            self._embedder = SentenceTransformer(
                settings.embedding_model,
                device=settings.device,
            )
        if settings.enable_reranker and self._reranker is None:
            self._reranker = CrossEncoder(
                settings.reranker_model,
                device=settings.device,
            )
        
        # Chỉ load Local LLM nếu không dùng Gemini API
        if settings.enable_llm and not os.getenv("GEMINI_API_KEY") and (self._tokenizer is None or self._llm is None):
            self._tokenizer = AutoTokenizer.from_pretrained(settings.llm_model)
            self._llm = AutoModelForCausalLM.from_pretrained(
                settings.llm_model,
                torch_dtype=torch.float32,
                device_map=None,
            )

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, 1), dtype=np.float32)
        embeddings = self._embedder.encode(texts, normalize_embeddings=True)
        return np.array(embeddings, dtype=np.float32)

    def ingest(self, restaurant_id: Optional[int] = None) -> Dict[str, Any]:
        self._load_models()
        rows = fetch_kb_rows(restaurant_id=restaurant_id)
        chunks = build_chunks(rows)
        embeddings = self._embed_texts([c["chunk_text"] for c in chunks])
        inserted = upsert_chunks(chunks, embeddings, restaurant_id)
        self.load_index()
        return {"rows": len(rows), "chunks": inserted}

    def load_index(self) -> None:
        with engine.begin() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT id, restaurant_id, source_type, source_id, chunk_text, embedding, embedding_dim
                    FROM rag_chunks
                    """
                )
            ).mappings().all()

        self._chunk_records = [dict(r) for r in rows]
        if not self._chunk_records:
            self._index = None
            return

        embeddings = []
        for row in self._chunk_records:
            vector = np.frombuffer(row["embedding"], dtype=np.float32)
            embeddings.append(vector)

        matrix = np.vstack(embeddings).astype(np.float32)
        faiss.normalize_L2(matrix)
        index = faiss.IndexFlatIP(matrix.shape[1])
        index.add(matrix)
        self._index = index

    def _search(self, query: str, restaurant_id: Optional[int]) -> List[Dict[str, Any]]:
        if self._index is None:
            return []

        query_vector = self._embed_texts([query])
        faiss.normalize_L2(query_vector)
        search_k = max(settings.top_k_retrieval * 5, settings.top_k_retrieval)
        scores, indices = self._index.search(query_vector, search_k)

        candidates = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._chunk_records):
                continue
            record = dict(self._chunk_records[idx])
            if restaurant_id is not None and record.get("restaurant_id") != restaurant_id:
                continue
            record["score"] = float(score)
            candidates.append(record)
            if len(candidates) >= settings.top_k_retrieval:
                break

        return candidates

    def _rerank(self, query: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not chunks or not settings.enable_reranker or self._reranker is None:
            return []

        pairs = [(query, c["chunk_text"]) for c in chunks]
        scores = self._reranker.predict(pairs)
        reranked = []
        for chunk, score in zip(chunks, scores):
            updated = dict(chunk)
            updated["rerank_score"] = float(score)
            reranked.append(updated)

        reranked.sort(key=lambda c: c["rerank_score"], reverse=True)
        return reranked[: settings.top_k_rerank]

    def _build_prompt(self, question: str, contexts: List[Dict[str, Any]], history: Optional[List[Dict[str, str]]] = None) -> Any:
        context_text = "\n\n".join(
            [f"- {c['chunk_text']}" for c in contexts]
        )

        system_message = (
            "Bạn là trợ lý ảo của nhà hàng. Nhiệm vụ của bạn là tư vấn dựa trên [Ngữ cảnh]. "
            "Quy tắc tuyệt đối: "
            "1. CHỈ dựa vào thông tin có trong [Ngữ cảnh]. "
            "2. Nếu khách hỏi món không có, chỉ cần xin lỗi và báo không có. KHÔNG tự bịa thêm thông tin, KHÔNG tự hỏi ngược lại để chào mời những món không có. "
            "3. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.\n\n"
            "Ví dụ:\n"
            "Khách: 'Nhà hàng có nước dừa không?'\n"
            "Bạn: 'Xin lỗi, hiện tại nhà hàng chúng tôi chưa phục vụ nước dừa.'\n"
        )

        messages = [
            {"role": "system", "content": system_message}
        ]
        
        if history:
            messages.extend(history)
            
        messages.append(
            {
                "role": "user",
                "content": f"[Ngữ cảnh]:\n{context_text}\n\n[Câu hỏi]: {question}",
            }
        )

        if os.getenv("GEMINI_API_KEY"):
            return messages

        if hasattr(self._tokenizer, "apply_chat_template"):
            return self._tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )

        return (
            f"<|system|>{system_message}</s>"
            f"<|user|>{messages[1]['content']}</s>"
            "<|assistant|>"
        )

    def _generate(self, prompt: Any) -> str:
        if os.getenv("GEMINI_API_KEY") and genai and isinstance(prompt, list):
            try:
                system_instruction = ""
                gemini_messages = []
                for msg in prompt:
                    if msg["role"] == "system":
                        system_instruction += msg["content"] + "\n"
                    elif msg["role"] == "user":
                        gemini_messages.append({"role": "user", "parts": [msg["content"]]})
                    elif msg["role"] == "assistant":
                        gemini_messages.append({"role": "model", "parts": [msg["content"]]})
                        
                model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_instruction.strip())
                response = model.generate_content(gemini_messages)
                return response.text.strip()
            except Exception as e:
                print("Gemini API Error:", e)
                return "Xin loi, hien tai he thong AI Cloud dang gap su co."

        if not settings.enable_llm or self._llm is None:
            return "Xin loi, hien tai he thong chua san sang sinh cau tra loi."
            
        inputs = self._tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(self._llm.device) for k, v in inputs.items()}

        output = self._llm.generate(
            **inputs,
            max_new_tokens=settings.max_new_tokens,
            do_sample=True,
            temperature=settings.temperature,
            top_p=settings.top_p,
        )
        input_len = inputs["input_ids"].shape[1]
        generated_tokens = output[0][input_len:]
        text = self._tokenizer.decode(generated_tokens, skip_special_tokens=True)
        return text.strip()

    def answer(self, question: str, restaurant_id: Optional[int], history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        self._load_models()
        candidates = self._search(question, restaurant_id)
        reranked = self._rerank(question, candidates)
        if not reranked:
            return {
                "response": "Xin loi, hien tai toi chua co du thong tin de tra loi.",
                "context": [],
            }

        prompt = self._build_prompt(question, reranked, history)
        response = self._generate(prompt)

        sources = [
            {
                "source_type": c.get("source_type"),
                "source_id": c.get("source_id"),
                "restaurant_id": c.get("restaurant_id"),
                "score": c.get("rerank_score"),
            }
            for c in reranked
        ]

        return {
            "response": response,
            "context": [c.get("chunk_text") for c in reranked],
            "sources": sources,
        }


rag_engine = RAGEngine()
