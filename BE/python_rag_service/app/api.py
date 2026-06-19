from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.rag import rag_engine
from app.schemas import ChatRequest, ChatResponse, IngestRequest, IngestResponse


app = FastAPI(title="RAG Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    rag_engine.initialize()
    if not getattr(rag_engine, "_chunk_records", None):
        print("Index is empty. Auto-ingesting data into RAG index...")
        try:
            rag_engine.ingest(restaurant_id=None)
        except Exception as exc:
            print(f"Warning: Failed to auto-ingest on startup: {exc}")
    else:
        print(f"RAG index initialized successfully with {len(rag_engine._chunk_records)} chunks.")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse)
def ingest(request: IngestRequest) -> IngestResponse:
    try:
        result = rag_engine.ingest(restaurant_id=request.restaurantId)
        return IngestResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    if not request.message:
        raise HTTPException(status_code=400, detail="message is required")

    try:
        result = rag_engine.answer(request.message, request.restaurantId, request.history)
        return ChatResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
