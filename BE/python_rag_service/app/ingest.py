from __future__ import annotations

from typing import Iterable, List, Dict, Any, Optional

import numpy as np
from sqlalchemy import text

from app.config import settings
from app.db import engine


def _chunk_text(text_value: str, chunk_size: int, overlap: int) -> List[str]:
    cleaned = " ".join(str(text_value).split())
    if not cleaned:
        return []

    chunks = []
    start = 0
    length = len(cleaned)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = cleaned[start:end]
        chunks.append(chunk)
        if end == length:
            break
        start = max(end - overlap, 0)

    return chunks


def fetch_kb_rows(restaurant_id: Optional[int] = None) -> List[Dict[str, Any]]:
    query = text(settings.kb_query)
    with engine.begin() as conn:
        rows = conn.execute(query, {"restaurant_id": restaurant_id}).mappings().all()
    return [dict(row) for row in rows]


def upsert_chunks(
    chunks: Iterable[Dict[str, Any]],
    embeddings: np.ndarray,
    restaurant_id: Optional[int],
) -> int:
    if embeddings.size == 0:
        return 0

    embedding_dim = int(embeddings.shape[1])

    with engine.begin() as conn:
        if restaurant_id is None:
            conn.execute(text("DELETE FROM rag_chunks"))
        else:
            conn.execute(
                text("DELETE FROM rag_chunks WHERE restaurant_id = :restaurant_id"),
                {"restaurant_id": restaurant_id},
            )

        insert_sql = text(
            """
            INSERT INTO rag_chunks (
                restaurant_id,
                source_type,
                source_id,
                chunk_text,
                embedding,
                embedding_dim,
                metadata
            ) VALUES (
                :restaurant_id,
                :source_type,
                :source_id,
                :chunk_text,
                :embedding,
                :embedding_dim,
                :metadata
            )
            """
        )

        payload = []
        for idx, chunk in enumerate(chunks):
            embedding_bytes = embeddings[idx].astype(np.float32).tobytes()
            payload.append(
                {
                    "restaurant_id": chunk.get("restaurant_id"),
                    "source_type": chunk.get("source_type"),
                    "source_id": chunk.get("source_id"),
                    "chunk_text": chunk.get("chunk_text"),
                    "embedding": embedding_bytes,
                    "embedding_dim": embedding_dim,
                    "metadata": chunk.get("metadata"),
                }
            )

        conn.execute(insert_sql, payload)

    return len(payload)


def build_chunks(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    for row in rows:
        content = row.get("content", "")
        for part in _chunk_text(content, settings.chunk_size, settings.chunk_overlap):
            chunks.append(
                {
                    "restaurant_id": row.get("restaurant_id"),
                    "source_type": row.get("source_type"),
                    "source_id": row.get("source_id"),
                    "chunk_text": part,
                    "metadata": None,
                }
            )
    return chunks
