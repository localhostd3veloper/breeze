from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    thinking: bool = False
    history: list[HistoryMessage] = []
    web_search: bool = False
    images: list[str] = []


class ChatResponse(BaseModel):
    response: str
    model: str


class SummarizeRequest(BaseModel):
    history: list[HistoryMessage]
