from typing import Optional, List, Any
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    restaurantId: Optional[int] = None
    tableId: Optional[int] = None
    history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    response: str
    context: list
    sources: Optional[List[Any]] = None


class IngestRequest(BaseModel):
    restaurantId: Optional[int] = None


class IngestResponse(BaseModel):
    rows: int
    chunks: int
