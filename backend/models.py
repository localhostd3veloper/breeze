from typing import Literal

from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    thinking: bool = False
    history: list[HistoryMessage] = []
    web_search: bool = True
    images: list[str] = []
    genui: Literal["auto", "on", "off"] = "auto"


class SummarizeRequest(BaseModel):
    history: list[HistoryMessage]
