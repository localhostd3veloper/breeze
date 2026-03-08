import json
from datetime import datetime, timezone
from typing import Any, Iterator

from langfuse import propagate_attributes

from config import logger, openai_client
from models import HistoryMessage
from tools import TOOLS, dispatch_tool


def _emit(event: dict) -> str:
    return json.dumps(event, ensure_ascii=False) + "\n"


class _ReasoningParser:
    """Splits streaming text into (text, reasoning) by parsing <think>...</think> tags."""

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
        """Flush remaining buffer at end of stream."""
        text_out = "" if self._in_think else self._buffer
        reasoning_out = self._buffer if self._in_think else ""
        self._buffer = ""
        return text_out, reasoning_out


# chars; below this, skip thinking unless it looks complex
_SIMPLE_MESSAGE_THRESHOLD = 50


_SIMPLE_GREETINGS = {
    "hi",
    "hello",
    "hey",
    "howdy",
    "hiya",
    "how are you",
    "how are you?",
    "how are you doing",
    "how's it going",
    "what's up",
    "sup",
    "yo",
    "good morning",
    "good afternoon",
    "good evening",
    "good night",
    "bye",
    "goodbye",
    "see you",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "lol",
    "haha",
    "nice",
    "cool",
    "great",
    "awesome",
}

_COMPLEX_SIGNALS = (
    "why",
    "how to",
    "how do",
    "how does",
    "how can",
    "how would",
    "explain",
    "what is",
    "what are",
    "difference",
    "compare",
    "calculate",
    "solve",
    "code",
    "write",
    "debug",
    "translate",
)


def _needs_thinking(message: str) -> bool:
    """Return False for short conversational messages that don't benefit from thinking."""
    msg = message.strip()
    lower = msg.lower().rstrip("?!.")
    if lower in _SIMPLE_GREETINGS:
        return False
    if len(msg) > _SIMPLE_MESSAGE_THRESHOLD:
        return True
    return any(signal in lower for signal in _COMPLEX_SIGNALS)


def _system_prompt() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"The current date and time is {now}. "
        "You are Breeze, a witty and helpful AI assistant. Answer clearly and concisely."
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
) -> list[dict[str, Any]]:
    if images:
        user_content: Any = [{"type": "text", "text": message}]
        for img in images:
            if img.startswith("http://") or img.startswith("https://"):
                url = img
            else:
                url = f"data:image/jpeg;base64,{img}"
            user_content.append({"type": "image_url", "image_url": {"url": url}})
    else:
        user_content = message

    return [
        {"role": "system", "content": _system_prompt()},
        *[{"role": m.role, "content": m.content} for m in (history or [])],
        {"role": "user", "content": user_content},
    ]


def stream_response(
    model: str,
    message: str,
    history: list[HistoryMessage] | None = None,
    web_search: bool = False,
    images: list[str] | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
) -> Iterator[str]:
    try:
        messages = _build_messages(message, history, images)
        enable_thinking = _needs_thinking(message)
        create_kwargs: dict[str, Any] = {
            "metadata": {"model": model},
            "model": model,
            "messages": messages,
            "stream": True,
            "max_tokens": _needs_thinking(message) and 4086 or 2048,
            "temperature": 0.3,
            "user": user_id,
            "verbosity": "low",
        }
        if enable_thinking:
            create_kwargs["extra_body"] = {
                "enable_thinking": True,
                "thinking_budget": 1024,
            }

        if web_search:
            create_kwargs["tools"] = TOOLS  # type: ignore[assignment]
        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="chat.stream_responses"
        ):
            stream = openai_client.chat.completions.create(**create_kwargs)  # type: ignore[call-overload]

        # Stream content directly, accumulating any tool calls in parallel.
        tool_calls_acc: dict[int, dict[str, Any]] = {}
        assistant_content = ""
        parser = _ReasoningParser()

        for chunk in stream:
            delta = chunk.choices[0].delta

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    entry = tool_calls_acc.setdefault(
                        tc.index,
                        {
                            "id": "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""},
                        },
                    )
                    if tc.id:
                        entry["id"] = tc.id
                    if tc.function.name:
                        entry["function"]["name"] += tc.function.name
                    if tc.function.arguments:
                        entry["function"]["arguments"] += tc.function.arguments

            # Qwen thinking models expose reasoning via delta.reasoning.
            thinking_chunk = getattr(delta, "reasoning", None)
            if thinking_chunk and not tool_calls_acc:
                yield _emit({"type": "reasoning", "content": thinking_chunk})

            if delta.content:
                assistant_content += delta.content
                if not tool_calls_acc:
                    text_out, reasoning_out = parser.feed(delta.content)
                    if reasoning_out:
                        yield _emit({"type": "reasoning", "content": reasoning_out})
                    if text_out:
                        yield _emit({"type": "text", "content": text_out})

        text_out, reasoning_out = parser.flush()
        if reasoning_out:
            yield _emit({"type": "reasoning", "content": reasoning_out})
        if text_out:
            yield _emit({"type": "text", "content": text_out})

        if not tool_calls_acc or not web_search:
            yield _emit({"type": "done"})
            return

        # Execute tool calls and stream the final response.
        tool_calls_list = [tool_calls_acc[i] for i in sorted(tool_calls_acc)]
        messages.append(
            {
                "role": "assistant",
                "content": assistant_content or None,
                "tool_calls": tool_calls_list,
            }
        )

        for tc in tool_calls_list:
            args = json.loads(tc["function"]["arguments"])
            result = dispatch_tool(tc["function"]["name"], args)
            messages.append(
                {"role": "tool", "tool_call_id": tc["id"], "content": result}
            )

        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="tools.stream_responses"
        ):
            final_stream = openai_client.chat.completions.create(  # type: ignore[call-overload, arg-type]
                metadata={"model": model},
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )
        final_parser = _ReasoningParser()
        for chunk in final_stream:
            final_delta = chunk.choices[0].delta
            thinking_chunk = getattr(final_delta, "reasoning", None)
            if thinking_chunk:
                yield _emit({"type": "reasoning", "content": thinking_chunk})
            content = final_delta.content or ""
            if content:
                text_out, reasoning_out = final_parser.feed(content)
                if reasoning_out:
                    yield _emit({"type": "reasoning", "content": reasoning_out})
                if text_out:
                    yield _emit({"type": "text", "content": text_out})

        text_out, reasoning_out = final_parser.flush()
        if reasoning_out:
            yield _emit({"type": "reasoning", "content": reasoning_out})
        if text_out:
            yield _emit({"type": "text", "content": text_out})

        yield _emit({"type": "done"})

    except Exception as e:
        logger.error("stream_response error: %s", e)
        yield _emit({"type": "error", "message": str(e)})
