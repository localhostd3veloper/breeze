# Model configuration for Breeze
# Hardware: i9-13800HX, RTX 4060 CUDA 8GB VRAM, 32GB RAM
#
# Edit this file to swap models at any time.
# All models below should be available via Ollama (https://ollama.com/library).

from settings import settings

MODELS: dict[str, str] = {
    "default": "phi4-mini:3.8b",
    "vision": "gemma3:12b",
    "thinking": "qwen3:8b",
    "web_search": "qwen2.5:7b",
    "summarize": "phi4-mini:3.8b",
    # Generative UI needs the most capable model available: it has to hold a
    # spec grammar in its head and emit strictly valid JSON.
    "genui": "gemma3:12b",
}


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
