from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings


def _build_db_url() -> str:
    return (
        f"mysql+pymysql://{settings.db_user}:{settings.db_password}"
        f"@{settings.db_host}:{settings.db_port}/{settings.db_name}?charset=utf8mb4"
    )


engine = create_engine(_build_db_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)


def ensure_tables() -> None:
    ddl = """
    CREATE TABLE IF NOT EXISTS rag_chunks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        restaurant_id BIGINT NULL,
        source_type VARCHAR(50) NOT NULL,
        source_id VARCHAR(64) NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding LONGBLOB NOT NULL,
        embedding_dim INT NOT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rag_chunks_restaurant (restaurant_id)
    )
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
