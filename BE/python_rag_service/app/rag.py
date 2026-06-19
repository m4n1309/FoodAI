from __future__ import annotations

from typing import List, Dict, Any, Optional

import numpy as np
import faiss
from google import genai
from google.genai import types
from sqlalchemy import text


from app.config import settings
from app.db import engine, ensure_tables
from app.ingest import fetch_kb_rows, build_chunks, upsert_chunks


class RAGEngine:
    def __init__(self) -> None:
        self._client: Optional[genai.Client] = None
        self._index = None
        self._chunk_records: List[Dict[str, Any]] = []

    def initialize(self) -> None:
        ensure_tables()
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is required. Set it in .env file."
            )
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self.load_index()

    def _embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, settings.embedding_dimension), dtype=np.float32)

        all_embeddings: List[List[float]] = []
        batch_size = 100  # Gemini API batch limit

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = self._client.models.embed_content(
                model=settings.embedding_model,
                contents=batch,
            )
            for emb in result.embeddings:
                all_embeddings.append(emb.values)

        return np.array(all_embeddings, dtype=np.float32)

    def ingest(self, restaurant_id: Optional[int] = None) -> Dict[str, Any]:
        rows = fetch_kb_rows(restaurant_id=restaurant_id)
        chunks = build_chunks(rows)

        # Get existing embeddings map to avoid re-embedding unchanged content
        with engine.begin() as conn:
            existing_rows = conn.execute(
                text("SELECT source_type, source_id, chunk_text, embedding FROM rag_chunks")
            ).mappings().all()
        existing_map = {}
        for r in existing_rows:
            existing_map[(r["source_type"], r["source_id"], r["chunk_text"])] = r["embedding"]

        # Determine which chunks need embedding
        chunks_to_embed = []
        for c in chunks:
            key = (c["source_type"], c["source_id"], c["chunk_text"])
            if key not in existing_map:
                chunks_to_embed.append(c)

        # Call Gemini API only for new/changed chunks
        if chunks_to_embed:
            new_embeddings = self._embed_texts([c["chunk_text"] for c in chunks_to_embed])
            # Match them back
            for idx, c in enumerate(chunks_to_embed):
                key = (c["source_type"], c["source_id"], c["chunk_text"])
                existing_map[key] = new_embeddings[idx].astype(np.float32).tobytes()

        # Build the final embeddings list/array in the same order as chunks
        final_embeddings_list = []
        for c in chunks:
            key = (c["source_type"], c["source_id"], c["chunk_text"])
            emb_bytes = existing_map.get(key)
            if emb_bytes is not None:
                vector = np.frombuffer(emb_bytes, dtype=np.float32)
                final_embeddings_list.append(vector)
            else:
                final_embeddings_list.append(np.zeros(settings.embedding_dimension, dtype=np.float32))

        embeddings = np.array(final_embeddings_list, dtype=np.float32)
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

        # Lấy top_k_rerank theo cosine score (thay thế reranker)
        return candidates[: settings.top_k_rerank]

    def _build_prompt(
        self,
        question: str,
        contexts: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        context_text = "\n\n".join(
            [f"- {c['chunk_text']}" for c in contexts]
        )

        system_message = (
            "Bạn là trợ lý ảo của nhà hàng. Nhiệm vụ của bạn là tư vấn dựa trên [Ngữ cảnh]. "
            "Quy tắc tuyệt đối: "
            "1. CHỈ dựa vào thông tin có trong [Ngữ cảnh]. "
            "2. Nếu khách hỏi món không có, chỉ cần xin lỗi và báo không có. KHÔNG tự bịa thêm thông tin, KHÔNG tự hỏi ngược lại để chào mời những món không có. "
            "3. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.\n"
            "4. Phân biệt rõ ràng khái niệm ngôn ngữ khi tư vấn hoặc đề xuất:\n"
            "   - 'Món nước' / 'Món có nước' / 'Ăn món nước': Chỉ đề xuất các món ăn chính có nước dùng/nước lèo (ví dụ: bún, phở, mì, hủ tiếu, súp, canh). Tuyệt đối KHÔNG đề xuất các loại đồ uống (trà đá, nước dừa, nước ngọt...) hoặc món lẩu (hotpot).\n"
            "   - 'Đồ uống' / 'Nước uống' / 'Nước giải khát' / 'Uống nước': Là các loại nước giải khát (ví dụ: nước dừa, trà đá, nước ngọt, bia, sinh tố).\n\n"
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

        return messages

    def _generate(self, prompt: List[Dict[str, str]]) -> str:
        system_instruction = ""
        gemini_contents: List[types.Content] = []

        for msg in prompt:
            if msg["role"] == "system":
                system_instruction += msg["content"] + "\n"
            elif msg["role"] == "user":
                gemini_contents.append(
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=msg["content"])],
                    )
                )
            elif msg["role"] == "assistant":
                gemini_contents.append(
                    types.Content(
                        role="model",
                        parts=[types.Part.from_text(text=msg["content"])],
                    )
                )

        try:
            response = self._client.models.generate_content(
                model=settings.llm_model,
                contents=gemini_contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction.strip(),
                    temperature=settings.temperature,
                    top_p=settings.top_p,
                    max_output_tokens=settings.max_new_tokens,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                ),
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return "Xin lỗi, hiện tại hệ thống AI đang gặp sự cố. Vui lòng thử lại sau."

    def answer(
        self,
        question: str,
        restaurant_id: Optional[int],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        candidates = self._search(question, restaurant_id)
        if not candidates:
            return {
                "response": "Xin lỗi, hiện tại tôi chưa có đủ thông tin để trả lời.",
                "context": [],
            }

        prompt = self._build_prompt(question, candidates, history)
        response = self._generate(prompt)

        sources = [
            {
                "source_type": c.get("source_type"),
                "source_id": c.get("source_id"),
                "restaurant_id": c.get("restaurant_id"),
                "score": c.get("score"),
            }
            for c in candidates
        ]

        return {
            "response": response,
            "context": [c.get("chunk_text") for c in candidates],
            "sources": sources,
        }


rag_engine = RAGEngine()
