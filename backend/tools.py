import json
from typing import Any

from config import logger, tavily_client

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for current information. Use this for recent events, "
                "news, or facts that may not be in your training data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                },
                "required": ["query"],
            },
        },
    }
]


def run_web_search(query: str) -> str:
    logger.info("Tavily search: %r", query)
    result = tavily_client.search(query=query, max_results=5)
    logger.info("Tavily returned %d results", len(result.get("results", [])))
    return json.dumps(result)


def dispatch_tool(name: str, args: dict[str, Any]) -> str:
    if name == "web_search":
        return run_web_search(args["query"])
    return json.dumps({"error": f"unknown tool: {name}"})
