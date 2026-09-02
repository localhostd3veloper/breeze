"""Decides whether a chat turn should be answered with generative UI.

The router is a cheap gate in front of an expensive model. It must never be the
reason a chat turn fails, so every failure path returns False and falls back to
the ordinary prose answer.
"""

from langfuse.openai import OpenAI  # type: ignore[attr-defined]

from models_config import MODELS
from settings import logger

_ROUTER_TIMEOUT_SECONDS = 10.0

_ROUTER_PROMPT = (
    "You are a router. Decide whether the answer to the user's message would be "
    "genuinely better with a visual: a chart, a table, metric tiles, or a "
    "side-by-side comparison.\n"
    "\n"
    "Answer YES only if the answer would contain quantitative data with more "
    "than one figure, several comparable items or options, or a structured "
    "breakdown that is awkward to read as a paragraph.\n"
    "\n"
    "Answer NO for plain conversation, greetings, opinions, short factual "
    "answers, code, debugging, writing or editing text, and anything the reader "
    "would understand just as well from a sentence.\n"
    "\n"
    "Reply with exactly one word: YES or NO."
)


def should_render_ui(client: OpenAI, message: str, mode: str) -> bool:
    """Return True when this turn should be answered with `breeze-ui` widgets.

    `mode` is the request's `genui` field: "on" forces UI, "off" disables it,
    and "auto" asks the small local model. Fails open to False.
    """
    if mode == "off":
        return False
    if mode == "on":
        return True

    try:
        resp = client.with_options(timeout=_ROUTER_TIMEOUT_SECONDS).chat.completions.create(
            model=MODELS["default"],
            messages=[
                {"role": "system", "content": _ROUTER_PROMPT},
                {"role": "user", "content": message},
            ],  # type: ignore[arg-type]
            max_tokens=3,
            temperature=0,
        )
        answer = (resp.choices[0].message.content or "").strip().upper()
        decision = answer.startswith("YES")
        logger.info("genui router: %r -> %s", answer, decision)
        return decision
    except Exception as e:
        # A router failure must never break a chat turn — fall back to prose.
        logger.warning("genui router failed, falling back to prose: %s", e)
        return False
