from fastapi import FastAPI, HTTPException, Request, Security
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from chat import stream_response
from config import API_KEY, openai_client
from models import ChatRequest, ChatResponse, SummarizeRequest
from models_config import MODELS, select_model

# --- Rate limiting ---
limiter = Limiter(key_func=get_remote_address)

# --- App ---
app = FastAPI(title="Breeze Chat API", version="1.0.0", description="Breeze Chat API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# --- Auth ---
api_key_header = APIKeyHeader(name="X-API-Key")


def verify_api_key(key: str = Security(api_key_header)) -> str:
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key


# --- Routes ---
@app.get("/")
def root():
    return {"status": "ok", "message": "Breeze Chat API is running"}


@app.post("/completion", response_model=ChatResponse)
@limiter.limit("10/minute")
async def completion(request: Request, body: ChatRequest, _: str = Security(verify_api_key)):
    try:
        user_id = request.headers.get("X-User-Id")
        session_id = request.headers.get("X-Session-Id")
        model = select_model(body.thinking, body.web_search, bool(body.images))

        async def _stream():
            for event in stream_response(
                model,
                body.message,
                body.history,
                body.web_search,
                body.images,
                thinking=body.thinking,
                user_id=user_id,
                session_id=session_id,
            ):
                if await request.is_disconnected():
                    break
                yield event

        return StreamingResponse(_stream(), media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


_SUMMARIZE_PROMPT = (
    "You are a title generator. Given a conversation, output a short title (4 words or fewer) "
    "that captures the main topic. Output only the title — no quotes, no punctuation at the end."
)


@app.post("/summarize")
@limiter.limit("20/minute")
def summarize(
    request: Request, body: SummarizeRequest, _: str = Security(verify_api_key)
):
    try:
        conversation = "\n".join(f"{m.role.upper()}: {m.content}" for m in body.history)
        messages = [
            {
                "role": "user",
                "content": f"{_SUMMARIZE_PROMPT}\n\nConversation:\n{conversation}",
            }
        ]
        resp = openai_client.chat.completions.create(
            model=MODELS["summarize"],
            messages=messages,  # type: ignore[arg-type]
        )
        return {"title": (resp.choices[0].message.content or "").strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
