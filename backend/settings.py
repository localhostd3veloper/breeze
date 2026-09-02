import logging
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_key: str = "breeze-api-key"
    tavily_api_key: str = "tavily-api-key"
    ollama_base_url: str = "http://localhost:11434/v1"

    # Consumed by the Langfuse SDK via os.environ, not read directly here.
    langfuse_secret_key: str | None = None
    langfuse_public_key: str | None = None
    langfuse_base_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


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
