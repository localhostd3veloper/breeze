# Generative UI in the chat stream

Let the assistant render charts, stat tiles, cards, tabs and tables inline in a message
instead of only prose — Station-styled, subtly animated, persisted across reloads.

## Decisions (agreed)

| Question   | Decision                                                                     |
| ---------- | ---------------------------------------------------------------------------- |
| Format     | Fenced JSON spec block — ` ```breeze-ui `, zod-validated against a whitelist |
| Model      | Route UI turns to a stronger model, provider-agnostic via env                |
| Routing    | Strong model writes the whole reply (prose + UI) when UI is warranted        |
| Components | Charts, cards/stat tiles, tabs/accordion, tables/comparison                  |
| Charts     | Recharts + shadcn `chart` wrapper                                            |

**No arbitrary code is ever evaluated.** The model emits data, not JSX. Every renderable
component is on a compile-time whitelist; an unknown `type` renders as collapsed JSON.

## Why the fence, and what it buys for free

The spec lives inside the assistant's `content`, so it flows through the existing pipeline
untouched:

- **No stream-protocol change** — `StreamEvent` stays as-is, `/api/chat` stays a pure proxy
- **No DB change** — persisted in `content`; a reload re-renders the same widget
- **No client-hook change** for persistence — `useChatStream` already accumulates `content`
- **Streams progressively** — Streamdown hands the renderer `isIncomplete` directly, and
  the parser independently detects a truncated prefix, so the widget settles out of a
  skeleton rather than flashing an error on every token

## Architecture

````
user turn
   ↓
backend/app.py  /completion
   ↓
router: should this answer render UI?   ← cheap local YES/NO, or forced by `genui` flag
   ↓ no                    ↓ yes
local model            strong model (UI_MODEL_*) + genui system prompt
(unchanged)                ↓
   └──────────→ NDJSON text events, some containing ```breeze-ui fences
                           ↓
              MessageResponse (Streamdown `renderers` plugin slot)
                           ↓
              zod parse → whitelist dispatch → Station-styled React
````

## Tasks

### 1. Spec contract — the single source of truth

- [x] `lib/genui/schema.ts` — union on `type` over `chart`, `metrics`, `card`, `tabs`,
      `table`, `comparison`, with inferred TS types. **Deviation:** no `z.lazy` recursion —
      `tabs` holds non-recursive leaves. Recursive zod needs hand-written types, defeats
      `discriminatedUnion`, and did not compile; flat is also the better design.
- [x] `lib/genui/parse.ts` — `parseGenUiSpec(raw): { ok, spec } | { ok: false, error }`.
      Never throws. Tolerates trailing commas / stray prose the way small models emit them.
- [x] Keep the schema deliberately **small and flat**. Every optional field is a field the
      model can get wrong. Reliability beats expressiveness here.

### 2. Render layer — `components/genui/`

- [x] `bun add recharts`. **Deviation:** no `components/ui/chart.tsx` — the stock shadcn
      wrapper carries its own `--color-<key>` var scheme and chrome, so the chart is built
      directly on Recharts against Station tokens instead. Fewer layers, one palette.
- [x] Categorical palette derived and **validated** — see `tasks/chart-design.md`. Six
      slots, both modes, all hard checks pass (worst CVD ΔE 14.1 light / 13.2 dark).
      `--chart-1..5` stays for sequential/ordered data only. Validator vendored at
      `scripts/validate_palette.js`; re-run both modes if any hex changes.
- [x] Apply that palette + the mark/legend/interaction rules in `tasks/chart-design.md`.
      Light-mode brass and moss are below 3:1 on paper → direct labels required.
- [x] `genui-block.tsx` — dispatcher + skeleton (incomplete fence) + error fallback
- [x] `genui-chart.tsx` — bar / line / area / pie, mono axis labels (`readout`), hairline
      grid, animate-on-mount only, `prefers-reduced-motion` respected
- [x] `genui-metrics.tsx` — KPI row; brass reserved for negative/attention deltas
- [x] `genui-card.tsx` — instrument panel: `eyebrow` label, hairline rule, body
- [x] `genui-tabs.tsx` — wraps existing `components/ui/tabs.tsx`, renders nested widgets
- [x] `genui-table.tsx` — sortable columns, numeric right-align (detected from the data,
      not declared by the model). Inline bars dropped as unnecessary chrome.
- [x] `genui-comparison.tsx` — items × attributes grid
- [x] Animation budget: one entrance transition per widget via `motion`, staggered ~40ms.
      Nothing loops. The landing page's wind-field is the app's only ambient motion and
      that stays true.

### 3. Wire into the message renderer

- [x] `components/ai-elements/message.tsx` — registered a `breeze-ui` renderer in
      Streamdown's `plugins.renderers` slot. **Better than planned:** this is a
      first-class API that composes with `@streamdown/code`, so no `code` override and no
      risk to shiki highlighting on other fences.
- [x] Confirmed — used Streamdown's `renderers` plugin slot instead of a `code` override, which composes with the `code` plugin rather than replacing it
      (shiki highlighting for normal fences must still work).
- [x] Verified the `memo` comparator on `MessageResponse` (children-only) still updates
      correctly as the fence fills in.

### 4. Backend — provider-agnostic strong model

- [x] `backend/settings.py` — `ui_model_base_url` (default: `ollama_base_url`),
      `ui_model_api_key` (default `"ollama"`), `ui_model_name` (default: a local model).
      Works with no new credentials; swap providers by env only.
- [x] `backend/models_config.py` — `MODELS["genui"]`, overridable by `ui_model_name`
- [x] `backend/app.py` — second client `app.state.ui_openai` in lifespan; reuse the same
      instance when `base_url` matches so nothing changes in the pure-local default.
- [x] `backend/genui_prompt.py` — the spec grammar as a system prompt with 2–3 few-shot
      examples. **Highest-leverage file in this plan** — output quality is mostly prompt.
- [x] `backend/genui_router.py` — one cheap local YES/NO call (~1 token, constrained
      decoding) deciding whether the turn deserves UI. Fail open to prose on any error.
- [x] `backend/models.py` — `ChatRequest.genui: Literal["auto","on","off"] = "auto"`
- [x] `backend/chat.py` — pick client + model + system prompt from that decision. Keep the
      existing local path byte-identical when the answer is "prose".

### 5. Frontend plumbing

- [x] `useChatStream` — pass `genui` through. `/api/chat` needs no change (pure passthrough).
- [x] No `genui` UI control yet; `"auto"` is the default. A toggle next to web-search /
      thinking is a follow-up, not v1.

### 6. Verification (nothing is done until this passes)

- [x] `bun run lint` and `bun run build` clean
- [x] **Deterministic render pass:** built `/dev/genui` (21 cases). a fixture conversation of hand-written fences
      covering every widget + every failure mode (truncated JSON, unknown type, empty
      data, one data point, 40 rows, absurdly long labels). This proves the renderer
      without the model as a variable.
- [x] Screenshot light + dark; mobile checked programmatically for overflow via `chrome-devtools`
- [ ] **NOT DONE — Reload a conversation containing widgets** — must re-render from Mongo identically
- [x] **End-to-end against live gemma3:12b** — 3 widgets (2 charts + metrics) emitted,
      all validated by the real `parseGenUiSpec`. Mid-stream skeleton→widget still
      unverified in the browser (fixture 12 covers the state itself).
- [x] Prose-only path reviewed as unchanged (code-level; see review caveat)

## Risks / open items

- **Reliability is the whole game.** Even a strong model will occasionally emit a bad spec.
  The error fallback must look intentional, never like a crash.
- **Router latency** adds a local call before the strong call on every turn. If it proves
  slow, collapse it into the strong model's own judgement and accept the cost.
- `--chart-1..5` are sequential, not categorical — resolved in task 2.
- ~~**CLAUDE.md needs updating**~~ — done: env vars, fence contract, second model client,
  and the false "OpenAI (summarization)" claim corrected. The voice-mode claim flagged in
  the previous design pass was already gone from the file.

## Review

**Shipped.** Generative UI end to end: a ```breeze-ui fence in an assistant reply renders as
a Station-styled widget — chart (bar/line/area/pie), metrics, card, table, comparison, tabs.
Backend routes UI turns to a stronger, provider-agnostic model. `bun run lint`, `tsc --noEmit`and`bun run build` all pass.

**The format choice paid off exactly as predicted.** Zero changes to `lib/types/stream.ts`,
`app/api/chat/route.ts`, the Mongoose schema, or the message API. The whole feature is
additive plus two small edits (`message.tsx` renderer registration, `useChatStream` flag).

**Better than planned.** The brief told the implementer to override Streamdown's `code`
component and reach for `useIsCodeFenceIncomplete`. Reading the actual types turned up a
first-class `plugins.renderers` slot (`{ component, language }`, with `isIncomplete` passed
in). That composes with `@streamdown/code` instead of replacing it, so shiki highlighting
provably cannot regress — verified by fixture 21.

**Two real bugs found by verifying rather than assuming.**

1. **Hydration mismatch on every widget, for reduced-motion users only.** `useReducedMotion()`
   returns false during SSR, so branching `initial` on it made the server emit `opacity: 0`
   while a reduced-motion client emitted `opacity: 1`. Fixed by holding `initial` constant
   and collapsing the transition duration instead. This would have shipped invisibly — it
   only reproduces for the users least served by being ignored.
2. **Y-axis labels clipped.** Right-anchored ticks at `x=28` with `left: -12` margin pushed
   "600ms" off the edge. Fixed by removing the negative margin and moving the unit into the
   frame header, where it is stated once instead of on every tick.

**Discarded from opencode's start.** Its `lib/genui/schema.ts` did not compile — five errors
from recursive zod types. Dropping the recursion (tabs hold non-recursive leaves) fixed all
five _and_ is the better design: it matches the "keep the schema flat" rule, removes an
unbounded render-depth hazard, and spares a small model a nesting decision. Its `parse.ts`
regex-based comma stripping could corrupt string contents; replaced with a string-aware
scanner that also distinguishes _truncated_ from _malformed_, which is what drives the
skeleton-vs-error split.

**Colour was computed, not chosen.** `--chart-1..5` is a sequential verdigris ramp and would
have produced four indistinguishable teals as categorical series. The six-slot palette in
`tasks/chart-design.md` was validated with the vendored `scripts/validate_palette.js` in both
modes (worst adjacent CVD ΔE 14.1 light / 13.2 dark). Dark is genuinely re-stepped — my first
attempt failed the band check on brass (L 0.78) and moss (L 0.74).

**Verified.** All 21 fixtures assert correctly at `/dev/genui`: 11 widgets render; truncated
JSON → skeleton; unknown type, empty data, ragged comparison rows and series/axis length
mismatch → quiet collapsed error; trailing commas recover; single point, 40 rows and absurd
labels render. Zero console errors. At 390px `body.scrollWidth === clientWidth` — no widget
overflows. Light and dark both eyeballed.

**Post-review fix: the feature did not actually work, and the cause was mine.**

First live run produced prose only, cut off mid-sentence, and on a follow-up the model
replied "as an AI text-based model, I'm unable to display charts" — proof the system prompt
never reached it. Root cause: the grammar was **~3,385 tokens** against Ollama's **4096-token
default window**, and Ollama's OpenAI-compatible endpoint **silently ignores**
`options.num_ctx` (tested at 16384 — still lost the prompt). Ollama truncates from the front,
so the grammar and the Breeze identity were evicted before generation.

Three fixes: grammar rewritten 3,385 → **647 tokens** with a budget assertion
(`test_prompt_budget`); genui `max_tokens` 4096 → 1536, since prompt and completion share
the window; and history trimmed on genui turns so a long conversation cannot re-trigger it.

**Now verified live:** the original prompt yields table + metrics; the follow-up that
previously drew the refusal yields 2 bar charts + metrics. Every fence passes the real
`parseGenUiSpec`, and `finish_reason` is `stop` rather than a length cut.

**Still NOT verified.**

- Router accuracy beyond the handful of turns tried (it did fire `YES` correctly here).
- **Reload persistence untested.** The argument that `content` round-trips through Mongo is
  sound and needs no new field, but it was not exercised against a real conversation.
- **The separate-endpoint branch was never exercised** — no non-local `UI_MODEL_BASE_URL` was
  configured, so only the client-reuse path has run.
- The prose-only path was confirmed unchanged by reading the diff, not by A/B-running it
  against `main`.
- Legend ordering for stacked charts is alphabetical rather than stack order. Cosmetic;
  each entity keeps its own colour, so the "colour follows the entity" rule holds.

**Incidental fix.** `.vercel/**` was missing from `eslint.config.mjs` ignores while being
gitignored, so `bun run lint` could never pass on a machine with a local Vercel build. Added,
along with the vendored validator.

---

## Follow-up pass (same day)

### 1. Wind field silted up over long sessions

The trail was made by fading the canvas with `destination-out` at alpha 0.035 — a
_multiplicative_ fade. Alpha is stored as an 8-bit int, so once a pixel decays to `1/255`,
`1 × 0.965` rounds back to `1` and never reaches zero. Every faint streak became permanent
and they accumulated for as long as the tab stayed open.

Fixed by removing the accumulator: `clearRect` every frame, and each particle keeps its own
rolling buffer of recent positions which is drawn as its tail. Bounded by construction.
Trails are stroked in batched alpha bands, so a frame is a fixed handful of paths
regardless of particle count. Recycled particles clear their history, otherwise a streak
gets drawn from the old position to the respawn point.

### 2. Too green

The complaint was the _wash_, not the accent: neutrals carried C 0.007–0.022, which reads
strongly on a dark surface. Cut to C ≤ 0.006 light and ≤ 0.010 dark, and both grounds
lightened (paper `#edf1ef` → `#f3f5f4`, night → `#111515`). Verdigris chroma eased
0.09 → 0.072 (light) and 0.10 → 0.082 (dark). Brass, destructive, `--chart-*` and
`--series-*` untouched.

**Consequence caught by re-running the validator:** a lighter night surface pushed dark
violet `#8048a5` to 2.97:1, just under the 3:1 gate that `chart-design.md` claims all six
dark slots clear. Nudged to `#8a4fb0` — smallest change that restores ≥ 3:1 while keeping
the L band and the best tritan ΔE of the candidates. Doc updated with the new surfaces.

### 3. Streaks invisible in light mode, and too short

On near-white paper a pale tint of the accent has almost no contrast — in light mode the
streaks must be _darker_ than the surface. `--wind-stroke` is now a theme token
(mid-dark verdigris on paper, soft light accent on night) instead of a per-usage arbitrary
value, so each mode gets the correct direction. Tail lengthened 16 → 52 samples with
6 fade bands, and particle lifetimes raised so a particle outlives its own tail.

**Not visually verified:** items 3's final look — the server was stopped before I could
re-screenshot. Build and lint pass.
