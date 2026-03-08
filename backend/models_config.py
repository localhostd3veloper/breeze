# Model configuration for Breeze
# Hardware: i9-13800HX, RTX 4060 CUDA 8GB VRAM, 32GB RAM
#
# Edit this file to swap models at any time.
# All models below should be available via Ollama (https://ollama.com/library).

MODELS: dict[str, str] = {
    "default": "phi4-mini:3.8b",
    "vision": "llava:7b",
    "thinking": "qwen3:8b",
    "web_search": "qwen2.5:7b",
    "summarize": "phi4-mini:3.8b",
}


def select_model(thinking: bool, web_search: bool, has_images: bool) -> str:
    """Pick the right model based on requested capabilities.

    Priority: images > thinking > web_search > default
    """
    if has_images:
        return MODELS["vision"]
    if thinking:
        return MODELS["thinking"]
    if web_search:
        return MODELS["web_search"]
    return MODELS["default"]
