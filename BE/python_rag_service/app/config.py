import os
from pathlib import Path
from dataclasses import dataclass

from dotenv import load_dotenv


_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH)


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("RAG_PORT", "8001"))

    # Gemini API
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # Database
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "restaurant_qr_ordering")
    db_port: int = int(os.getenv("DB_PORT", "3306"))

    # Models (Gemini)
    embedding_model: str = os.getenv("RAG_EMBEDDING_MODEL", "gemini-embedding-001")
    llm_model: str = os.getenv("RAG_LLM_MODEL", "gemini-2.5-flash-lite")
    embedding_dimension: int = int(os.getenv("RAG_EMBEDDING_DIM", "3072"))

    # RAG parameters
    top_k_retrieval: int = int(os.getenv("RAG_TOP_K_RETRIEVAL", "10"))
    top_k_rerank: int = int(os.getenv("RAG_TOP_K_RERANK", "3"))
    chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "512"))
    chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "64"))
    max_new_tokens: int = int(os.getenv("RAG_MAX_NEW_TOKENS", "512"))
    temperature: float = float(os.getenv("RAG_TEMPERATURE", "0.1"))
    top_p: float = float(os.getenv("RAG_TOP_P", "0.9"))

    kb_query: str = os.getenv(
        "RAG_KB_QUERY",
        """
        SELECT
            'menu_item' AS source_type,
            CAST(mi.id AS CHAR) AS source_id,
            mi.restaurant_id AS restaurant_id,
            CONCAT('Món ', mi.name,
                   IF(cat.name IS NULL, '', CONCAT(' thuộc danh mục ', cat.name)),
                   ' có giá ', mi.price, ' VNĐ. ',
                   IF(mi.discount_price IS NULL, '', CONCAT('Giá khuyến mãi: ', mi.discount_price, ' VNĐ. ')),
                   IF(mi.is_spicy = 1, 'Món này có vị cay. ', ''),
                   IF(mi.is_vegetarian = 1, 'Món này phù hợp cho người ăn chay. ', ''),
                   IF(mi.allergens IS NULL, '', CONCAT('Cảnh báo dị ứng: ', mi.allergens, '. ')),
                   IF(mi.description IS NULL, '', CONCAT('Mô tả chi tiết: ', mi.description))) AS content
        FROM menu_items mi
        LEFT JOIN categories cat ON mi.category_id = cat.id
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
        UNION ALL
        SELECT
            'promotion' AS source_type,
            CAST(p.id AS CHAR) AS source_id,
            p.restaurant_id AS restaurant_id,
            CONCAT('Chương trình khuyến mãi: ', p.name, 
                   ' (Mã code: ', p.code, '). ',
                   IF(p.description IS NULL, '', CONCAT('Mô tả chương trình: ', p.description, '. ')),
                   'Giảm ', IF(p.discount_type = 'percentage', CONCAT(p.discount_value, '%'), CONCAT(p.discount_value, ' VNĐ')),
                   IF(p.min_order_amount IS NULL, '', CONCAT(' cho đơn hàng tối thiểu từ ', p.min_order_amount, ' VNĐ.')),
                   ' Khuyến mãi áp dụng từ ngày ', DATE_FORMAT(p.valid_from, '%d/%m/%Y'), 
                   ' đến ngày ', DATE_FORMAT(p.valid_until, '%d/%m/%Y'), '.') AS content
        FROM promotions p
        WHERE p.is_active = 1 AND (:restaurant_id IS NULL OR p.restaurant_id = :restaurant_id)
        """,
    )


settings = Settings()
