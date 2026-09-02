"""SSRF-guarded HTTP GET, and HTML reduced to text.

The model can be talked into fetching a URL by anything it reads, so this module
assumes the URL is hostile. It is the only place in the backend that makes an
outbound request to an address a model chose.

What it refuses, and why each one matters:

- **non-http(s) schemes** -- `file:///etc/passwd`, `gopher://` (request smuggling).
- **credentials in the URL** -- `http://user:pass@host` leaks them into logs, and
  `http://expected.com@attacker.com` reads as a trusted host to a human reviewer.
- **non-standard ports** -- port 6379 or 11434 is not a web page, it is the Redis
  or Ollama instance next to this process.
- **any address that is not globally routable** -- loopback, RFC1918, link-local
  (`169.254.169.254` is the cloud metadata endpoint), CGNAT, multicast, reserved,
  in IPv4 and IPv6 including IPv4-mapped forms.
- **redirects into any of the above** -- checked per hop, because a public host
  answering `302 -> http://127.0.0.1:11434` is the standard way past a check that
  only looks at the URL it was given.

Residual risk, stated rather than hidden: the host is resolved for validation and
resolved again by the HTTP client when it connects, so a DNS entry that changes
between the two (rebinding) is not defeated here. Closing it means pinning the
connection to the validated address, which `httpx` can do only through a custom
transport; the redirect and port guards above make it a narrow window, and no
credential or session travels on these requests for a rebound host to collect.
"""

import ipaddress
import socket
from html.parser import HTMLParser
from urllib.parse import parse_qs, quote_plus, urljoin, urlsplit

import httpx

from evidence import Evidence
from settings import logger

_ALLOWED_SCHEMES = {"http", "https"}
_ALLOWED_PORTS = {80, 443}
_MAX_REDIRECTS = 3
_TIMEOUT_SECONDS = 8.0
_MAX_BYTES = 512 * 1024

_ALLOWED_CONTENT_TYPES = {
    "text/html",
    "text/plain",
    "application/xhtml+xml",
    "application/json",
    "text/xml",
    "application/xml",
}

# Honest about what this is. No cookies and no auth header ever go out, so a
# fetched page cannot act on behalf of the user or this service.
_HEADERS = {
    "User-Agent": "BreezeBot/1.0 (+automated fetch for a chat assistant)",
    "Accept": "text/html,text/plain;q=0.9,*/*;q=0.1",
    "Accept-Language": "en",
}


class UnsafeUrl(ValueError):
    """The URL is refused before any packet is sent."""


def _assert_public_host(host: str) -> None:
    """Resolve `host` and refuse unless every answer is globally routable.

    Every answer, not the first: a name resolving to both a public address and
    127.0.0.1 must not be reachable by whichever the client happens to pick.
    """
    try:
        answers = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise UnsafeUrl(f"cannot resolve host: {host}") from e

    if not answers:
        raise UnsafeUrl(f"cannot resolve host: {host}")

    for *_, sockaddr in answers:
        ip = ipaddress.ip_address(sockaddr[0])
        # ::ffff:127.0.0.1 is loopback wearing an IPv6 costume; unwrap first.
        mapped = getattr(ip, "ipv4_mapped", None)
        if mapped is not None:
            ip = mapped
        # `is_global` is the single check that covers loopback, private, link-local,
        # CGNAT, multicast, reserved and unspecified, in both families.
        if not ip.is_global:
            raise UnsafeUrl(f"host {host} resolves to non-public address {ip}")


def _validate(url: str) -> str:
    """Refuse the URL, or return it normalised. Runs on every redirect hop."""
    parts = urlsplit(url)

    if parts.scheme not in _ALLOWED_SCHEMES:
        raise UnsafeUrl(f"scheme not allowed: {parts.scheme or '(none)'}")
    if parts.username or parts.password:
        raise UnsafeUrl("credentials in URL are not allowed")
    if not parts.hostname:
        raise UnsafeUrl("URL has no host")

    try:
        port = parts.port
    except ValueError as e:  # malformed port, e.g. http://host:notanumber/
        raise UnsafeUrl("invalid port") from e
    if port is not None and port not in _ALLOWED_PORTS:
        raise UnsafeUrl(f"port not allowed: {port}")

    _assert_public_host(parts.hostname)
    return url


def get(url: str) -> tuple[str, str]:
    """SSRF-checked GET. Returns `(final_url, body)`; raises `UnsafeUrl` otherwise.

    Redirects are followed by hand so each hop is validated before it is requested.
    """
    current = _validate(url)

    with httpx.Client(
        follow_redirects=False,
        timeout=_TIMEOUT_SECONDS,
        headers=_HEADERS,
        # No cookie jar: nothing a page sets can be replayed to the next one.
        cookies=None,
    ) as client:
        for _ in range(_MAX_REDIRECTS + 1):
            with client.stream("GET", current) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise UnsafeUrl("redirect without a location")
                    current = _validate(urljoin(current, location))
                    continue

                response.raise_for_status()

                content_type = response.headers.get("content-type", "")
                media_type = content_type.split(";")[0].strip().lower()
                if media_type not in _ALLOWED_CONTENT_TYPES:
                    raise UnsafeUrl(f"content-type not allowed: {media_type or '(none)'}")

                # Cap while streaming. Content-Length is attacker-supplied, so the
                # only cap that holds is the one counted off the wire.
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_bytes():
                    chunks.append(chunk)
                    size += len(chunk)
                    if size >= _MAX_BYTES:
                        logger.info("fetch truncated at %d bytes: %s", _MAX_BYTES, current)
                        break

                encoding = response.encoding or "utf-8"
                body = b"".join(chunks)[:_MAX_BYTES].decode(encoding, errors="replace")
                return current, body

    raise UnsafeUrl(f"too many redirects (>{_MAX_REDIRECTS})")


# --- HTML -> text ---------------------------------------------------------------
#
# stdlib, not BeautifulSoup: no new dependency, and an allowlist-shaped extractor
# is exactly what is wanted here -- what survives is text nodes and nothing else.

#: Elements whose content is never prose, and which are where injected text hides.
#: `head` is deliberately absent -- <title> lives there, and head's other children
#: are already covered here (script, style) or are void tags (meta, link).
_SKIP_TAGS = frozenset(
    {
        "script", "style", "noscript", "template", "svg", "iframe",
        "object", "embed", "canvas", "math", "form", "select", "textarea",
    }
)

#: Void elements never carry an end tag, so they must not open a skip depth.
_VOID_TAGS = frozenset(
    {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
     "param", "source", "track", "wbr"}
)

_BREAK_TAGS = frozenset(
    {"p", "div", "br", "li", "tr", "section", "article", "header", "footer",
     "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "td", "th"}
)


class _TextExtractor(HTMLParser):
    """Keeps visible text. Drops scripts, styles, comments and hidden elements.

    Hidden elements are dropped because `display:none` text is invisible to a
    person checking the page but perfectly visible to the model -- the classic
    way to plant instructions on an otherwise innocuous page. HTML comments go
    the same way: `HTMLParser` routes them to `handle_comment`, which this class
    deliberately does not implement.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._parts: list[str] = []
        self._skip_depth = 0
        self._in_title = False

    @staticmethod
    def _is_hidden(attrs: list[tuple[str, str | None]]) -> bool:
        for name, value in attrs:
            lowered = (value or "").lower()
            if name == "hidden":
                return True
            if name == "aria-hidden" and lowered == "true":
                return True
            if name == "style" and ("display:none" in lowered.replace(" ", "")
                                    or "visibility:hidden" in lowered.replace(" ", "")):
                return True
        return False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _VOID_TAGS:
            if tag == "br":
                self._parts.append("\n")
            return
        if self._skip_depth:
            self._skip_depth += 1
            return
        if tag in _SKIP_TAGS or self._is_hidden(attrs):
            self._skip_depth = 1
            return
        if tag == "title":
            self._in_title = True
        elif tag in _BREAK_TAGS:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _VOID_TAGS:
            return
        if self._skip_depth:
            self._skip_depth -= 1
            return
        if tag == "title":
            self._in_title = False
        elif tag in _BREAK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if self._in_title:
            self.title += data
        else:
            self._parts.append(data)

    def text(self) -> str:
        return "".join(self._parts)


def html_to_text(html: str) -> tuple[str, str]:
    """Return `(title, text)`. A malformed document yields whatever parsed."""
    parser = _TextExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception as e:  # HTMLParser is lenient, but never let markup break a turn
        logger.warning("HTML parse failed, using partial text: %s", e)
    return parser.title.strip(), parser.text()


def fetch_url(url: str) -> Evidence:
    """Fetch one page as `Evidence`. Never raises -- failure comes back as text.

    A refusal is reported to the model rather than thrown, so it can say what went
    wrong or try another source instead of the turn dying.
    """
    try:
        final_url, body = get(url)
    except UnsafeUrl as e:
        logger.warning("fetch refused (%s): %s", e, url)
        return Evidence(title="Fetch refused", url=url, text=f"Could not fetch this URL: {e}")
    except Exception as e:
        logger.warning("fetch failed (%s): %s", e, url)
        return Evidence(title="Fetch failed", url=url, text=f"Could not fetch this URL: {e}")

    title, text = html_to_text(body) if "<" in body[:2048] else ("", body)
    return Evidence(title=title or final_url, url=final_url, text=text)


# --- Keyless fallback search ----------------------------------------------------

_DDG_ENDPOINT = "https://html.duckduckgo.com/html/"


class _DuckDuckGoResults(HTMLParser):
    """Scrapes DuckDuckGo's no-JS HTML endpoint.

    Result links are wrapped as `//duckduckgo.com/l/?uddg=<encoded target>`, so the
    real URL is unwrapped from the query string. Anything unparseable is skipped --
    a fallback that returns fewer results is fine; one that raises is not.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.results: list[Evidence] = []
        self._href: str | None = None
        self._buffer: list[str] = []
        self._collecting: str | None = None

    @staticmethod
    def _unwrap(href: str) -> str:
        if "uddg=" not in href:
            return href
        target = parse_qs(urlsplit(href).query).get("uddg")
        return target[0] if target else href

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        attributes = dict(attrs)
        classes = (attributes.get("class") or "").split()
        if "result__a" in classes:
            self._collecting = "title"
            self._href = self._unwrap(attributes.get("href") or "")
            self._buffer = []
        elif "result__snippet" in classes:
            self._collecting = "snippet"
            self._buffer = []

    def handle_data(self, data: str) -> None:
        if self._collecting:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "a" or not self._collecting:
            return
        text = "".join(self._buffer).strip()
        if self._collecting == "title" and self._href:
            self.results.append(Evidence(title=text, url=self._href, text=""))
        elif self._collecting == "snippet" and self.results:
            last = self.results[-1]
            # Snippet follows its title, so it belongs to the most recent result.
            self.results[-1] = Evidence(last.title, last.url, f"{last.text} {text}".strip())
        self._collecting = None
        self._buffer = []


def fallback_search(query: str, max_results: int = 5) -> list[Evidence]:
    """Keyless search, used when Tavily is unavailable or out of credits.

    Returns `[]` on any failure. The caller treats an empty list as "no search
    happened", which degrades the answer instead of failing the turn.
    """
    try:
        _, body = get(f"{_DDG_ENDPOINT}?q={quote_plus(query)}")
    except Exception as e:
        logger.warning("fallback search failed: %s", e)
        return []

    parser = _DuckDuckGoResults()
    try:
        parser.feed(body)
        parser.close()
    except Exception as e:
        logger.warning("fallback search parse failed: %s", e)

    results = [r for r in parser.results if r.url.startswith(("http://", "https://"))]
    logger.info("fallback search returned %d results for %r", len(results), query)
    return results[:max_results]
