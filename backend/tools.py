import json
from typing import Any, Callable

from tavily import TavilyClient

from settings import logger

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


def _run_web_search(tavily: TavilyClient, args: dict[str, Any]) -> str:
    query = args["query"]
    logger.info("Tavily search: %r", query)
    result = tavily.search(query=query, max_results=5)
    logger.info("Tavily returned %d results", len(result.get("results", [])))
    return json.dumps(result)


_REGISTRY: dict[str, Callable[[TavilyClient, dict[str, Any]], str]] = {
    "web_search": _run_web_search,
}


def dispatch_tool(tavily: TavilyClient, name: str, args: dict[str, Any]) -> str:
    fn = _REGISTRY.get(name)
    if fn is None:
        logger.warning("Unknown tool requested: %r", name)
        return json.dumps({"error": f"unknown tool: {name}"})
    return fn(tavily, args)
