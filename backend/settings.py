import logging
import os

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_key: str = "breeze-api-key"
    tavily_api_key: str = "tavily-api-key"
    ollama_base_url: str = "http://localhost:11434/v1"

    # Generative-UI model endpoint. Defaults to the local Ollama endpoint, so a
    # clone with no new env vars keeps running entirely against local models.
    # Point ui_model_base_url at a hosted OpenAI-compatible API (plus its key)
    # to answer UI turns with a stronger remote model.
    ui_model_base_url: str = ""
    ui_model_api_key: str = "ollama"
    # Empty means "use MODELS['genui']" from models_config.
    ui_model_name: str = ""

    # Consumed by the Langfuse SDK via os.environ, not read directly here.
    langfuse_secret_key: str | None = None
    langfuse_public_key: str | None = None
    langfuse_base_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def _default_ui_base_url(self) -> "Settings":
        if not self.ui_model_base_url:
            self.ui_model_base_url = self.ollama_base_url
        return self


settings = Settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

# pydantic-settings reads .env without exporting to the process environment, but
# langfuse.openai auto-instrumentation resolves credentials from os.environ only.
# Without this, tracing silently falls back to a NoOpTracer.
for _name in ("langfuse_secret_key", "langfuse_public_key", "langfuse_base_url"):
    _value = getattr(settings, _name)
    if _value:
        os.environ.setdefault(_name.upper(), _value)

if not (settings.langfuse_secret_key and settings.langfuse_public_key):
    logger.warning("Langfuse credentials not set - LLM tracing disabled")
