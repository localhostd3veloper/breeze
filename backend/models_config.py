# Model configuration for Breeze.
# Hardware the defaults were tuned on: i9-13800HX, RTX 4060 CUDA 8GB VRAM, 32GB RAM.
#
# The model names themselves live in `models.json`, not here, because `setup.sh`
# has to pull exactly the same set before the app can start -- two hand-kept
# lists drift, and the failure only shows up as a 404 from Ollama mid-chat.
# Edit `models.json` to swap models; everything below is derived from it.
#
# Roles:
#   default    -- ordinary chat turns, and the fallback for anything unclaimed
#   vision     -- image attachments
#   thinking   -- extended reasoning turns
#   web_search -- turns where the acquire pass actually retrieved evidence
#   summarize  -- conversation-title generation
#   genui      -- generative UI; needs the most capable model available, since
#                 it holds a spec grammar in its head and emits strict JSON
#
# All of them must exist in the Ollama library (https://ollama.com/library).

import json
from pathlib import Path

from settings import settings

_MODELS_FILE = Path(__file__).parent / "models.json"

REQUIRED_ROLES = frozenset(
    {"default", "vision", "thinking", "web_search", "summarize", "genui"}
)

MODELS: dict[str, str] = json.loads(_MODELS_FILE.read_text())

# Fail at import rather than at the first chat turn that needs the missing role.
_missing = REQUIRED_ROLES - MODELS.keys()
if _missing:
    raise ValueError(f"{_MODELS_FILE} is missing required role(s): {sorted(_missing)}")


def required_models() -> list[str]:
    """Every distinct model that must be pulled, in first-use order.

    This is what `setup.sh` reads, so the set it pulls cannot drift from the set
    the app resolves.
    """
    return list(dict.fromkeys(MODELS.values()))


def resolve_genui_model() -> str:
    """The effective generative-UI model name.

    A `UI_MODEL_NAME` override wins, so a remote endpoint can name a model that
    does not exist in the local Ollama library. Otherwise `MODELS["genui"]`.
    """
    return settings.ui_model_name or MODELS["genui"]


def select_model(thinking: bool, has_images: bool, has_evidence: bool = False) -> str:
    """Pick the model that will write the answer.

    Priority: images > thinking > evidence > default.

    Note `has_evidence`, not `web_search`. Search is on by default now, so keying
    the model off the flag would put every "hi" on the heavier tool-capable model.
    The acquire pass has already run by the time this is called, so the question it
    answers is whether a search *actually happened* -- a turn that needed no web
    results is answered by the small default model, as it was before.
    """
    if has_images:
        return MODELS["vision"]
    if thinking:
        return MODELS["thinking"]
    if has_evidence:
        return MODELS["web_search"]
    return MODELS["default"]
