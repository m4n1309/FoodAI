# RAG Service

FastAPI service for RAG with FAISS, MySQL-backed embeddings, and Qwen2.5-3B-Instruct.

## Run

1. Create venv and install deps:

   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

2. Ensure BE/.env has DB_* and optional RAG_* settings.
   - If you hit startup crashes, set RAG_LOAD_ON_STARTUP=false (default) to lazy-load models.
   - macOS debug flags: RAG_DEVICE=cpu, RAG_ENABLE_RERANKER=false, RAG_ENABLE_LLM=false

3. Start service:

   python main.py

## Endpoints

- POST /ingest  {"restaurantId": 1}
- POST /chat    {"message": "...", "restaurantId": 1}
- GET /health
