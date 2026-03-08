import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Iterator

from langfuse import propagate_attributes

from config import logger, openai_client
from models import HistoryMessage
from tools import TOOLS, dispatch_tool


def _safe_json(s: str | None) -> dict[str, Any]:
    try:
        return json.loads(s or "{}")
    except json.JSONDecodeError:
        logger.warning("Tool arguments invalid JSON: %r", s)
        return {}


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
    thinking: bool = False,
    user_id: str | None = None,
    session_id: str | None = None,
) -> Iterator[str]:
    try:
        messages = list(_build_messages(message, history, images))
        create_kwargs: dict[str, Any] = {
            "metadata": {"model": model},
            "model": model,
            "messages": messages,
            "stream": True,
            "max_tokens": 4096 if thinking else 2048,
            "temperature": 0.3,
            "user": user_id,
        }
        if thinking:
            create_kwargs["extra_body"] = {
                "enable_thinking": True,
                "thinking_budget": 1024,
                "verbosity": "low",
            }
        else:
            create_kwargs["extra_body"] = {"verbosity": "low"}

        if web_search:
            create_kwargs["tools"] = TOOLS  # type: ignore[assignment]
        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="chat.stream_responses"
        ):
            stream = openai_client.with_options(timeout=60).chat.completions.create(**create_kwargs)  # type: ignore[call-overload]

        # Stream content directly, accumulating any tool calls in parallel.
        tool_calls_acc: dict[int, dict[str, Any]] = {}
        assistant_chunks: list[str] = []
        parser = _ReasoningParser()
        native_reasoning = False  # True once we see delta.reasoning; disables _ReasoningParser

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

            # Qwen thinking models expose reasoning via delta.reasoning.
            thinking_chunk = getattr(delta, "reasoning", None)
            if thinking_chunk and not tool_calls_acc:
                native_reasoning = True
                yield _emit({"type": "reasoning", "content": thinking_chunk})

            if delta.content:
                assistant_chunks.append(delta.content)
                if not tool_calls_acc:
                    if native_reasoning:
                        yield _emit({"type": "text", "content": delta.content})
                    else:
                        text_out, reasoning_out = parser.feed(delta.content)
                        if reasoning_out:
                            yield _emit({"type": "reasoning", "content": reasoning_out})
                        if text_out:
                            yield _emit({"type": "text", "content": text_out})

        if not native_reasoning:
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
                "content": "".join(assistant_chunks) or None,
                "tool_calls": tool_calls_list,
            }
        )

        with ThreadPoolExecutor() as pool:
            futures = {
                pool.submit(dispatch_tool, tc["function"]["name"], _safe_json(tc["function"]["arguments"])): tc
                for tc in tool_calls_list
            }
            tool_results: dict[str, str] = {}
            for f in as_completed(futures):
                tc = futures[f]
                tool_results[tc["id"]] = f.result()

        for tc in tool_calls_list:
            messages.append(
                {"role": "tool", "tool_call_id": tc["id"], "content": tool_results[tc["id"]]}
            )

        with propagate_attributes(
            user_id=user_id, session_id=session_id, trace_name="tools.stream_responses"
        ):
            final_stream = openai_client.with_options(timeout=60).chat.completions.create(  # type: ignore[call-overload, arg-type]
                metadata={"model": model},
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )
        final_parser = _ReasoningParser()
        final_native_reasoning = False
        for chunk in final_stream:
            final_delta = chunk.choices[0].delta
            thinking_chunk = getattr(final_delta, "reasoning", None)
            if thinking_chunk:
                final_native_reasoning = True
                yield _emit({"type": "reasoning", "content": thinking_chunk})
            content = final_delta.content or ""
            if content:
                if final_native_reasoning:
                    yield _emit({"type": "text", "content": content})
                else:
                    text_out, reasoning_out = final_parser.feed(content)
                    if reasoning_out:
                        yield _emit({"type": "reasoning", "content": reasoning_out})
                    if text_out:
                        yield _emit({"type": "text", "content": text_out})

        if not final_native_reasoning:
            text_out, reasoning_out = final_parser.flush()
            if reasoning_out:
                yield _emit({"type": "reasoning", "content": reasoning_out})
            if text_out:
                yield _emit({"type": "text", "content": text_out})

        yield _emit({"type": "done"})

    except Exception as e:
        logger.error("stream_response error: %s", e)
        yield _emit({"type": "error", "message": str(e)})
