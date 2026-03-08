import logging
import os

from dotenv import load_dotenv
from langfuse.openai import OpenAI  # type: ignore[attr-defined]
from tavily import TavilyClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

API_KEY = os.environ["API_KEY"]

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

openai_client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required by SDK but unused by Ollama
)
