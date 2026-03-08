from enum import Enum

from pydantic import BaseModel


class Model(str, Enum):
    qwen3_5_9b = "qwen3.5:9b"
    qwen3_coder_30b = "qooba/qwen3-coder-30b-a3b-instruct:q3_k_m"
    qwen3_coder_8b = "qooba/qwen3-coder-8b-instruct:q4_k_m"
    qwen2_5_coder_3b = "hf.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF:Q4_K_M"
    llama3 = "llama3"
    mistral = "mistral"
    codellama = "codellama"


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    model: Model = Model.qwen3_5_9b
    history: list[HistoryMessage] = []
    web_search: bool = False
    images: list[str] = []


class ChatResponse(BaseModel):
    response: str
    model: str


class SummarizeRequest(BaseModel):
    history: list[HistoryMessage]
    model: Model = Model.qwen2_5_coder_3b
