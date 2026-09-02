"""The `breeze-ui` spec grammar, taught to the generative-UI model.

**Keep this in lockstep with `lib/genui/schema.ts`**, which validates what the
model emits. A field described here but absent there fails validation; a field
there but missing here is a field the model will never use.

**Keep it short.** Ollama's default context window is 4096 tokens and its
OpenAI-compatible endpoint silently ignores `options.num_ctx`, so an oversized
system prompt does not merely waste budget -- Ollama truncates the prompt from the
front, dropping this grammar (and the assistant's identity) before the model ever
sees it. The symptom is a model that answers "I'm unable to display charts". The
first draft of this file was ~3,400 tokens and did exactly that.

Budget: this module must stay under ~1,000 tokens. `test_prompt_budget()` at the
bottom asserts it. If a hosted model with a large window is configured via
UI_MODEL_BASE_URL, richer instructions could be sent -- but the local default is
what has to work out of the box.
"""

GENUI_LANGUAGE = "breeze-ui"

# One compact grammar, one worked example. Resist adding a second example per
# widget type -- see the context-window note above.
GENUI_INSTRUCTIONS = """
You can render widgets inline by emitting a fenced ```breeze-ui block containing
exactly ONE JSON object. Emit up to 3 such blocks, each in its own fence.

Widgets (use only these fields):

chart: {"type":"chart","variant":"bar"|"line"|"area"|"pie","title":str,
  "unit":str(<=8, optional),"stacked":bool(optional), and EITHER
  "data":[{"name":str,"value":num}] OR "x":[str],"series":[{"name":str,"data":[num]}]}
  - Exactly one of data / series. series requires x, and each series' data
    length MUST equal x length. pie uses data only.
metrics: {"type":"metrics","title":str,"items":[{"label":str,"value":str|num,
  "delta":str(optional),"tone":"positive"|"negative"|"neutral"}]}  1-6 items.
card: {"type":"card","eyebrow":str(<=40),"title":str,"body":str,"footer":str}
table: {"type":"table","title":str,"columns":[{"key":str,"label":str}],
  "rows":[{<key>:str|num|bool}]}
comparison: {"type":"comparison","title":str,"columns":[str],
  "rows":[{"name":str,"values":[str|num|bool]}]}
  - Each row's values length MUST equal columns length.
tabs: {"type":"tabs","label":str,"items":[{"label":str,"body":[<widget>]}]}
  2-6 items. body holds chart/metrics/card/table/comparison. NEVER tabs in tabs.

Rules:
- Always write prose too. Widgets support the explanation; they never replace it.
- Only chart data the user gave you or that you state in the prose. Never invent numbers.
- One headline number is a metrics tile, never a one-bar chart.
- tone is semantic: a rising latency or error count is "negative", not "positive".
- Strict JSON: double quotes, no trailing commas, no comments. No JSX, no HTML.
- If prose is clearer, emit no widget at all.

Example -- user gives two builds' figures and asks which is faster:

Build B wins on both axes, and the gap is widest on cold start.

```breeze-ui
{"type":"metrics","title":"Build B vs A","items":[
 {"label":"Cold start","value":"1.2 s","delta":"-0.8 s","tone":"positive"},
 {"label":"Bundle","value":"240 kB","delta":"+12 kB","tone":"negative"}]}
```

```breeze-ui
{"type":"chart","variant":"bar","title":"Cold start","unit":"s",
 "x":["cold","warm"],"series":[{"name":"A","data":[2.0,0.9]},{"name":"B","data":[1.2,0.7]}]}
```

The bundle grew slightly, which is the trade you are making for the startup win.
"""


def genui_system_prompt(base_prompt: str) -> str:
    """Compose the base Breeze system prompt with the generative-UI grammar.

    `base_prompt` is the assistant's existing identity/behaviour prompt (see
    `chat._system_prompt`); it is passed in rather than imported so this module
    stays free of a cycle with `chat.py`, and so the identity text lives in
    exactly one place.
    """
    return f"{base_prompt.rstrip()}\n\n{GENUI_INSTRUCTIONS.strip()}\n"


# Rough chars-per-token for English + JSON. Deliberately conservative.
_CHARS_PER_TOKEN = 3.5
_TOKEN_BUDGET = 1000


def prompt_token_estimate() -> int:
    """Approximate token count of the grammar alone (excluding the base prompt)."""
    return round(len(GENUI_INSTRUCTIONS.strip()) / _CHARS_PER_TOKEN)


def test_prompt_budget() -> None:
    """Guard the context budget. See the module docstring for why this matters.

    Run with `python -c "import genui_prompt as g; g.test_prompt_budget()"`.
    """
    estimate = prompt_token_estimate()
    assert estimate <= _TOKEN_BUDGET, (
        f"genui grammar is ~{estimate} tokens, over the {_TOKEN_BUDGET} budget. "
        "Ollama's 4096-token default window will truncate it away and the model "
        "will not know it can render widgets at all."
    )
