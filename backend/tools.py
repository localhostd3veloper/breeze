"""Tool definitions and dispatch.

Every tool returns `list[Evidence]`, never a string of JSON. That is what lets the
answer pass carry web results in an ordinary user turn instead of a `role: "tool"`
message -- which in turn is what lets the generative-UI model, which has no
tool-calling support at all, answer from search results. See `evidence.py`.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable

from tavily import TavilyClient

from evidence import Evidence
from settings import logger
from webfetch import fallback_search, fetch_url

_MAX_RESULTS = 5

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for current information. Use this for recent events, "
                "news, prices, weather, or any fact that may have changed since "
                "training. Prefer one specific query over several vague ones."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_url",
            "description": (
                "Read one specific web page, when the user names a URL or a search "
                "result needs its full text. Returns the page's visible text only."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "Absolute http(s) URL of the page to read",
                    },
                },
                "required": ["url"],
            },
        },
    },
]


def _run_web_search(tavily: TavilyClient, args: dict[str, Any]) -> list[Evidence]:
    """Tavily, falling back to keyless search when it is unavailable.

    Credit exhaustion arrives as an ordinary exception from the SDK, and so does a
    bad key, a network blip or a timeout. None of them should be the reason a chat
    turn has no web results, so all of them take the same fallback.
    """
    query = str(args.get("query") or "").strip()
    if not query:
        return []

    try:
        result = tavily.search(query=query, max_results=_MAX_RESULTS)
        items = [
            Evidence(
                title=str(r.get("title") or ""),
                url=str(r.get("url") or ""),
                text=str(r.get("content") or ""),
            )
            for r in result.get("results", [])
        ]
        if items:
            logger.info("Tavily returned %d results for %r", len(items), query)
            return items
        logger.warning("Tavily returned no results for %r; trying fallback", query)
    except Exception as e:
        logger.warning("Tavily unavailable (%s); falling back to keyless search", e)

    return fallback_search(query, max_results=_MAX_RESULTS)


def _run_fetch_url(_: TavilyClient, args: dict[str, Any]) -> list[Evidence]:
    url = str(args.get("url") or "").strip()
    if not url:
        return []
    return [fetch_url(url)]


_REGISTRY: dict[str, Callable[[TavilyClient, dict[str, Any]], list[Evidence]]] = {
    "web_search": _run_web_search,
    "fetch_url": _run_fetch_url,
}


def dispatch_tool(tavily: TavilyClient, name: str, args: dict[str, Any]) -> list[Evidence]:
    fn = _REGISTRY.get(name)
    if fn is None:
        logger.warning("Unknown tool requested: %r", name)
        return []
    try:
        return fn(tavily, args)
    except Exception as e:
        # A tool must never take the turn down with it.
        logger.warning("Tool %r failed: %s", name, e)
        return []


def run_tools(
    tavily: TavilyClient, tool_calls: list[dict[str, Any]], args_of: Callable[[Any], dict[str, Any]]
) -> list[Evidence]:
    """Execute accumulated tool calls in parallel and flatten to one evidence list.

    Order follows `tool_calls` rather than completion order, so the [n] citations
    the model is shown are stable across runs.
    """
    if not tool_calls:
        return []

    with ThreadPoolExecutor() as pool:
        futures = {
            pool.submit(
                dispatch_tool, tavily, tc["function"]["name"], args_of(tc["function"]["arguments"])
            ): index
            for index, tc in enumerate(tool_calls)
        }
        by_index: dict[int, list[Evidence]] = {futures[f]: f.result() for f in as_completed(futures)}

    return [item for index in sorted(by_index) for item in by_index[index]]
