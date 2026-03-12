import asyncio
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from langfuse.openai import OpenAI  # type: ignore[attr-defined]
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from tavily import TavilyClient

from chat import stream_response, summarize as _summarize
from models import ChatRequest, SummarizeRequest
from models_config import select_model
from settings import logger, settings

# --- Rate limiting ---
limiter = Limiter(key_func=get_remote_address)

# --- Auth ---
api_key_header = APIKeyHeader(name="X-API-Key")


async def require_api_key(key: str = Security(api_key_header)) -> None:
    if key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.openai = OpenAI(
        base_url=settings.ollama_base_url,
        api_key="ollama",  # required by SDK but unused by Ollama
    )
    app.state.tavily = TavilyClient(api_key=settings.tavily_api_key)
    logger.info("Clients initialised (ollama=%s)", settings.ollama_base_url)
    yield
    logger.info("Shutting down")


# --- App ---
app = FastAPI(
    title="Breeze Chat API",
    version="1.0.0",
    description="Breeze Chat API",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]


# --- Routes ---
@app.get("/")
def root():
    return {"status": "ok", "message": "Breeze Chat API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/completion")
@limiter.limit("10/minute")
async def completion(
    request: Request,
    body: ChatRequest,
    _: None = Depends(require_api_key),
):
    user_id = request.headers.get("X-User-Id")
    session_id = request.headers.get("X-Session-Id")
    model = select_model(body.thinking, body.web_search, bool(body.images))

    async def _stream():
        try:
            for event in stream_response(
                client=request.app.state.openai,
                tavily=request.app.state.tavily,
                model=model,
                message=body.message,
                history=body.history,
                web_search=body.web_search,
                images=body.images,
                thinking=body.thinking,
                user_id=user_id,
                session_id=session_id,
            ):
                if await request.is_disconnected():
                    break
                yield event
        except Exception as e:
            logger.error("Streaming error: %s", e)
            raise

    return StreamingResponse(_stream(), media_type="application/x-ndjson")


@app.post("/summarize")
@limiter.limit("20/minute")
async def summarize(
    request: Request,
    body: SummarizeRequest,
    _: None = Depends(require_api_key),
):
    title = await asyncio.to_thread(_summarize, request.app.state.openai, body)
    return {"title": title}
