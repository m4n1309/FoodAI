import os
from pathlib import Path
from dataclasses import dataclass

from dotenv import load_dotenv


_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH)


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("RAG_PORT", "8001"))

    load_on_startup: bool = os.getenv("RAG_LOAD_ON_STARTUP", "false").lower() == "true"
    device: str = os.getenv("RAG_DEVICE", "cpu")
    enable_reranker: bool = os.getenv("RAG_ENABLE_RERANKER", "true").lower() == "true"
    enable_llm: bool = os.getenv("RAG_ENABLE_LLM", "true").lower() == "true"

    db_host: str = os.getenv("DB_HOST", "localhost")
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "restaurant_qr_ordering")
    db_port: int = int(os.getenv("DB_PORT", "3306"))

    embedding_model: str = os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-m3")
    reranker_model: str = os.getenv("RAG_RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
    llm_model: str = os.getenv("RAG_LLM_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")

    top_k_retrieval: int = int(os.getenv("RAG_TOP_K_RETRIEVAL", "10"))
    top_k_rerank: int = int(os.getenv("RAG_TOP_K_RERANK", "3"))
    chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "512"))
    chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "64"))
    max_new_tokens: int = int(os.getenv("RAG_MAX_NEW_TOKENS", "256"))
    temperature: float = float(os.getenv("RAG_TEMPERATURE", "0.1"))
    top_p: float = float(os.getenv("RAG_TOP_P", "0.9"))

    kb_query: str = os.getenv(
        "RAG_KB_QUERY",
        """
        SELECT
            'menu_item' AS source_type,
            CAST(mi.id AS CHAR) AS source_id,
            mi.restaurant_id AS restaurant_id,
            CONCAT('Món ', mi.name, ' có giá ', mi.price, ' VNĐ. ',
                   IF(mi.discount_price IS NULL, '', CONCAT('Giá khuyến mãi: ', mi.discount_price, ' VNĐ. ')),
                   IF(mi.is_spicy = 1, 'Món này có vị cay. ', ''),
                   IF(mi.is_vegetarian = 1, 'Món này phù hợp cho người ăn chay. ', ''),
                   IF(mi.allergens IS NULL, '', CONCAT('Cảnh báo dị ứng: ', mi.allergens, '. ')),
                   IF(mi.description IS NULL, '', CONCAT('Mô tả chi tiết: ', mi.description))) AS content
        FROM menu_items mi
        WHERE mi.is_available = 1 AND (:restaurant_id IS NULL OR mi.restaurant_id = :restaurant_id)
        UNION ALL
        SELECT
            'combo' AS source_type,
            CAST(c.id AS CHAR) AS source_id,
            c.restaurant_id AS restaurant_id,
            CONCAT('Combo ', c.name, ' có giá ', c.price, ' VNĐ. ',
                   IF(c.discount_price IS NULL, '', CONCAT('Giá khuyến mãi: ', c.discount_price, ' VNĐ. ')),
                   IF(c.description IS NULL, '', CONCAT('Mô tả chi tiết: ', c.description, '. ')),
                   'Các món trong combo bao gồm: ',
                   IFNULL((
                       SELECT GROUP_CONCAT(CONCAT(ci.quantity, ' ', mi.name) SEPARATOR ', ')
                       FROM combo_items ci
                       JOIN menu_items mi ON ci.menu_item_id = mi.id
                       WHERE ci.combo_id = c.id
                   ), 'Không có thông tin món.')
            ) AS content
        FROM combos c
        WHERE c.is_available = 1 AND (:restaurant_id IS NULL OR c.restaurant_id = :restaurant_id)
        """,
    )


settings = Settings()
