import json
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

from genui_prompt import genui_system_prompt, prompt_token_estimate
from genui_router import should_render_ui
from langfuse import propagate_attributes
from langfuse.openai import OpenAI  # type: ignore[attr-defined]
from models import HistoryMessage, SummarizeRequest
from models_config import MODELS, resolve_genui_model
from settings import logger
from tavily import TavilyClient
from tools import TOOLS, dispatch_tool


def _emit(event: dict) -> str:
    return json.dumps(event, ensure_ascii=False) + "\n"


def _safe_json(s: str | None) -> dict[str, Any]:
    try:
        return json.loads(s or "{}")
    except json.JSONDecodeError:
        logger.warning("Tool arguments invalid JSON: %r", s)
        return {}


class _ReasoningParser:
    """Splits streaming text into (text, reasoning) by parsing <think>…</think> tags."""

    def __init__(self) -> None:
        self._buffer = ""
        self._in_think = False

    def feed(self, chunk: str) -> tuple[str, str]:
        self._buffer += chunk
        text_out = ""
        reasoning_out = ""

        while self._buffer:
            if self._in_think:
                end = self._buffer.find("</think>")
                if end == -1:
                    safe = max(0, len(self._buffer) - 8)
                    reasoning_out += self._buffer[:safe]
                    self._buffer = self._buffer[safe:]
                    break
                else:
                    reasoning_out += self._buffer[:end]
                    self._buffer = self._buffer[end + len("</think>") :]
                    self._in_think = False
            else:
                start = self._buffer.find("<think>")
                if start == -1:
                    safe = max(0, len(self._buffer) - 7)
                    text_out += self._buffer[:safe]
                    self._buffer = self._buffer[safe:]
                    break
                else:
                    text_out += self._buffer[:start]
                    self._buffer = self._buffer[start + len("<think>") :]
                    self._in_think = True

        return text_out, reasoning_out

    def flush(self) -> tuple[str, str]:
        text_out = "" if self._in_think else self._buffer
        reasoning_out = self._buffer if self._in_think else ""
        self._buffer = ""
        return text_out, reasoning_out


# Ollama's default context window is 4096 tokens and its OpenAI-compatible
# endpoint ignores `options.num_ctx`, so the genui path has to budget for it.
GENUI_MAX_TOKENS = 1536
GENUI_HISTORY_BUDGET_CHARS = 4000


def _trim_history(
    history: list[HistoryMessage] | None, budget_chars: int
) -> list[HistoryMessage] | None:
    """Keep the most recent messages that fit in `budget_chars`.

    Trims from the oldest end, so the turns nearest the question survive. Used
    only on the genui path -- the prose path keeps its existing behaviour.
    """
    if not history:
        return history

    kept: list[HistoryMessage] = []
    used = 0
    for msg in reversed(history):
        cost = len(msg.content) + 16  # +role overhead
        if used + cost > budget_chars:
            break
        kept.append(msg)
        used += cost

    kept.reverse()
    return kept


def _system_prompt() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"The current date and time is {now}. "
        "You are Breeze, a witty and helpful AI assistant. Answer clearly and concisely. "
        "Do not discuss your underlying technology or creators. "
        "If asked, say you are Breeze. Refuse harmful or illegal requests. "
        "Use the web_search tool when the user asks about recent events, news, or anything "
        "that may require up-to-date information beyond your training data. "
        "When you use web_search results, always cite your sources with their URLs at the end of your response."
    )


def _build_messages(
    message: str,
    history: list[HistoryMessage] | None,
    images: list[str] | None = None,
    system: str | None = None,
) -> list[dict[str, Any]]:
    if images:
        user_content: Any = [{"type": "text", "text": message}]
        for img in images:
            url = (
                img
                if img.startswith(("http://", "https://"))
                else f"data:image/jpeg;base64,{img}"
            )
            user_content.append({"type": "image_url", "image_url": {"url": url}})
    else:
        user_content = message

    return [
        {"role": "system", "content": system or _system_prompt()},
        *[{"role": m.role, "content": m.content} for m in (history or [])],
        {"role": "user", "content": user_content},
    ]


def _stream_chunks(stream) -> Iterator[str]:
    """Yield NDJSON text/reasoning events from an OpenAI streaming response.

    Handles both native reasoning (delta.reasoning) and tag-based <think>…</think> parsing.
    Does NOT emit a 'done' event -- callers are responsible for that.
    """
    parser = _ReasoningParser()
    native_reasoning = False

    for chunk in stream:
        delta = chunk.choices[0].delta

        reasoning = getattr(delta, "reasoning", None)
        if reasoning:
            native_reasoning = True
            yield _emit({"type": "reasoning", "content": reasoning})

        if delta.content:
            if native_reasoning:
                yield _emit({"type": "text", "content": delta.content})
            else:
                text, rsn = parser.feed(delta.content)
                if rsn:
                    yield _emit({"type": "reasoning", "content": rsn})
                if text:
                    yield _emit({"type": "text", "content": text})

    if not native_reasoning:
        text, rsn = parser.flush()
        if rsn:
            yield _emit({"type": "reasoning", "content": rsn})
        if text:
            yield _emit({"type": "text", "content": text})


def stream_response(
    client: OpenAI,
    tavily: TavilyClient,
    model: str,
    message: str,
    history: list[HistoryMessage] | None = None,
    web_search: bool = False,
    images: list[str] | None = None,
    thinking: bool = False,
    user_id: str | None = None,
    session_id: str | None = None,
    ui_client: OpenAI | None = None,
    genui: str = "off",
) -> Iterator[str]:
    try:
        # --- Generative UI routing -------------------------------------------
        # Decided before anything else so the prose path below is untouched when
        # UI is not warranted. `use_genui` False == the pre-existing behaviour.
        use_genui = False
        if genui != "off":
            if web_search:
                # The two-pass tool flow and the widget grammar don't compose
                # cleanly; web_search wins and genui is skipped for this turn.
                logger.info("genui skipped: web_search takes precedence")
            else:
                use_genui = should_render_ui(client, message, genui)

        active_client = client
        system: str | None = None
        genui_history = history
        if use_genui:
            active_client = ui_client or client
            model = resolve_genui_model()
            system = genui_system_prompt(_system_prompt())
            # The grammar only works if it survives into the model's context.
            # Ollama's default window is 4096 tokens and it truncates the prompt
            # from the FRONT, so a long conversation silently evicts the system
            # prompt and the model then denies being able to render anything.
            # Trimming history is what keeps the grammar in the window.
            genui_history = _trim_history(history, GENUI_HISTORY_BUDGET_CHARS)
            logger.info(
                "genui active (model=%s, grammar~%d tok, history %d->%d msgs)",
                model,
                prompt_token_estimate(),
                len(history or []),
                len(genui_history or []),
            )

        messages = list(_build_messages(message, genui_history, images, system))

        create_kwargs: dict[str, Any] = {
            "metadata": {"model": model},
            "model": model,
            "messages": messages,
            "stream": True,
            # Prompt and completion SHARE Ollama's window, so asking for 4096
            # completion tokens inside a 4096-token window guarantees the prompt
            # gets truncated. Widget JSON is verbose but bounded (3 widgets max),
            # so this is comfortably enough while leaving room for the grammar.
            "max_tokens": 4096
            if thinking
            else (GENUI_MAX_TOKENS if use_genui else 2048),
            "temperature": 0.3,
            "user": user_id,
            "extra_body": {
                "enable_thinking": True,
                "thinking_budget": 1024,
                "verbosity": "low",
            }
            if thinking
            else {"verbosity": "low"},
        }
        if web_search:
            create_kwargs["tools"] = TOOLS  # type: ignore[assignment]

        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="chat.stream_responses"
        ):
            stream = active_client.with_options(timeout=60).chat.completions.create(
                **create_kwargs
            )  # type: ignore[call-overload]

        # First pass: stream content to client and accumulate any tool calls.
        tool_calls_acc: dict[int, dict[str, Any]] = {}
        assistant_chunks: list[str] = []
        parser = _ReasoningParser()
        native_reasoning = False

        for chunk in stream:
            delta = chunk.choices[0].delta

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    entry = tool_calls_acc.setdefault(
                        tc.index,
                        {
                            "id": tc.id or "",
                            "type": tc.type or "function",
                            "function": {"name": "", "arguments": ""},
                        },
                    )
                    if tc.id:
                        entry["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            entry["function"]["name"] = tc.function.name
                        if tc.function.arguments:
                            entry["function"]["arguments"] += tc.function.arguments

            reasoning = getattr(delta, "reasoning", None)
            if reasoning and not tool_calls_acc:
                native_reasoning = True
                yield _emit({"type": "reasoning", "content": reasoning})

            if delta.content:
                assistant_chunks.append(delta.content)
                if not tool_calls_acc:
                    if native_reasoning:
                        yield _emit({"type": "text", "content": delta.content})
                    else:
                        text, rsn = parser.feed(delta.content)
                        if rsn:
                            yield _emit({"type": "reasoning", "content": rsn})
                        if text:
                            yield _emit({"type": "text", "content": text})

        if not native_reasoning:
            text, rsn = parser.flush()
            if rsn:
                yield _emit({"type": "reasoning", "content": rsn})
            if text:
                yield _emit({"type": "text", "content": text})

        if not tool_calls_acc or not web_search:
            yield _emit({"type": "done"})
            return

        # --- Tool execution (parallel) ---
        tool_calls_list = [tool_calls_acc[i] for i in sorted(tool_calls_acc)]
        messages.append(
            {
                "role": "assistant",
                "content": "".join(assistant_chunks) or None,
                "tool_calls": tool_calls_list,
            }
        )

        with ThreadPoolExecutor() as pool:
            futures = {
                pool.submit(
                    dispatch_tool,
                    tavily,
                    tc["function"]["name"],
                    _safe_json(tc["function"]["arguments"]),
                ): tc
                for tc in tool_calls_list
            }
            tool_results: dict[str, str] = {
                futures[f]["id"]: f.result() for f in as_completed(futures)
            }

        for tc in tool_calls_list:
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": tool_results[tc["id"]],
                }
            )

        # Second pass: stream final response incorporating tool results.
        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="tools.stream_responses"
        ):
            final_stream = client.with_options(timeout=60).chat.completions.create(  # type: ignore[call-overload, arg-type]
                metadata={"model": model},
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )

        yield from _stream_chunks(final_stream)
        yield _emit({"type": "done"})

    except Exception as e:
        logger.error("stream_response error: %s", e)
        yield _emit({"type": "error", "message": str(e)})


_SUMMARIZE_PROMPT = (
    "You are a title generator. Given a conversation, output a short title (4 words or fewer) "
    "that captures the main topic. Output only the title -- no quotes, no punctuation at the end."
)


def summarize(client: OpenAI, body: SummarizeRequest) -> str:
    """Return a short title for the given conversation history."""
    conversation = "\n".join(f"{m.role.upper()}: {m.content}" for m in body.history)
    resp = client.chat.completions.create(
        model=MODELS["summarize"],
        messages=[
            {
                "role": "user",
                "content": f"{_SUMMARIZE_PROMPT}\n\nConversation:\n{conversation}",
            }
        ],  # type: ignore[arg-type]
    )
    return (resp.choices[0].message.content or "").strip()
