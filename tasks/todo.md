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

---

# Composer revamp — one input that starts centred and slides to the dock

A new screen should read as an invitation, not as an empty transcript with a
toolbar bolted to the bottom. So: a single-line input centred in the viewport,
which glides to the bottom the moment you send, with your message already above it.

## Decisions (agreed)

| Question       | Decision                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Where it lives | `app/chat/layout.tsx`, not either page — one DOM node across the route swap  |
| What drives it | `docked` derived from the transcript, no second source of truth              |
| Animation      | `motion` `layout` + `layoutDependency={docked}` (spring, reduced-motion off) |
| Optimism       | Optimistic user message under a **pending** conversation cache key           |
| Mode feedback  | Composer border takes the accent of the most-recently-enabled mode           |

### Why the composer moves into the layout

`/chat` → `/chat/[id]` is a real navigation. Two inputs in two pages cannot animate
into each other — the first unmounts, the second mounts, and the pill snaps. A shared
layout segment stays mounted across sibling pages, so the composer is _one_ element
whose position changes. That is the whole trick; everything else follows from it.

### Why a pending cache key

`handleSubmit` used to `await POST /api/conversations` before showing anything, so on
a new chat nothing moved until the server answered. The transcript is keyed by
conversation id and there is no id yet — so the optimistic message lands under
`['conversations', 'pending', 'messages']`, which `/chat` renders. The write is
synchronous, so the slide starts on keypress. When the real id arrives the list is
handed to the real key _before_ `router.replace`, so `/chat/[id]` paints what was
already on screen instead of flashing.

Messages stay exclusively in TanStack Query. No Zustand, no local mirror.

## Tasks

- [ ] `hooks/use-chat-messages.ts` — export `messagesQueryKey` + `PENDING_CONVERSATION_ID`;
      never fetch the pending key
- [ ] `app/chat/hooks/useChatStream.ts` — optimistic new-conversation path via the pending key
- [ ] `components/ai-elements/prompt-input.tsx` — drop `InputGroup` for a shell the caller can
      restyle (`shellClassName`), single-line textarea defaults, `PromptInputRow`,
      submit disabled while empty
- [ ] `components/Input.tsx` — single-line pill; modes as an ordered list so the border
      accent tracks the newest one
- [ ] `app/chat/components/chat-composer.tsx` — new; hero ↔ docked, greeting, health alert
- [ ] `app/chat/layout.tsx` — render the composer after `{children}`
- [ ] `app/chat/page.client.tsx` — pending transcript only; reset it on mount
- [ ] `app/chat/[id]/page.client.tsx` — drop the input; skip the intro fade on a warm cache
- [ ] `app/chat/components/chat-messages.tsx` — render nothing when empty (the greeting
      now belongs to the composer)
- [ ] `bun run lint` + `bun run build`

### 4. Headline text reveal

The h1 was one block fade+slide. Now each word rides up from behind its own clipped box,
staggered 55ms, 0.7s `cubic-bezier(0.16, 1, 0.3, 1)` — a plate sliding into place rather
than a flourish, which suits the signage direction.

Rendered server-side as plain spans with inline `animationDelay` and pure CSS keyframes,
so there is no client component, no JS, and no hydration flash on first paint.

Three traps handled:

- `.type-display` has `line-height: 0.94`, shorter than the font's cap-to-descender
  extent, so an unpadded mask crops caps and descenders. `.reveal-mask` pads `0.2em`
  top and bottom and removes it again with negative margins.
- The inter-word space is a sibling of the masks, not inside one. Trailing whitespace
  inside an inline-block creates no break opportunity, so putting it inside would stop
  the headline wrapping and overflow it on narrow screens.
- "can touch." is a single unit (nbsp) so the closing phrase can't be orphaned — this
  preserved the intent of the `&nbsp;` that was in the old markup.

Also fixed a **pre-existing** reduced-motion bug: the guard zeroed `animation-duration`
but not `animation-delay`, so anything with `fill-mode: both` sat at its `from` state
through its delay and then popped. Harmless at 120–520ms on the old hero; with a per-word
stagger it would have shown an empty headline. `animation-delay: 0ms !important` added.

### 5. Signed-in app review (server running, logged in)

- **Wordmark read "Breeze ." — my regression.** `TooltipTrigger` carried `flex gap-1`,
  harmless while the wordmark was the single text node `Breeze.`; splitting the period into
  a span gave the 4px gap something to act on. Removed `gap-1`.
- **Two empty-state greetings rendered at once.** `chat-messages.tsx` and the newer
  `chat-composer.tsx` each drew an _independent_ random pick from `emptyStateMessages`.
  The composer sits in `chat/layout.tsx`, so it is always present when the transcript is
  empty — the `ConversationEmptyState` was pure redundancy. Removed it plus the dead
  `greeting` state and the `isLoading` prop (the `[id]` route already fades the wrapper
  on load, so the child never needed it).
- **Input sat 103px below centre.** Horizontally it was exact; vertically the _empty_
  transcript still carried `flex-1`, so it split the column with the composer and the
  composer's `justify-center` landed in the bottom half. Measured:
  `header 52 / transcript 369 / composer 449`. Now the transcript only claims flex space
  when it has messages, so the composer owns the full column and the greeting+input group
  centres as one unit (optical centre within 14px). Docked state unchanged: `52 / 738 / 80`.
- **Meteors on the empty chat screen: tried, then reverted.** Too much. The landing page
  is a moment you see once, so ambient motion earns its place; the chat empty state is a
  screen you hit dozens of times a day, where a loop becomes noise — and repeating the
  signature dilutes the one place it means something. Removed.

### 6. What the empty chat screen got instead

This page already owns two purposeful beats: the greeting arriving, and the headline
fading as the input glides down to dock. The dock transition _is_ the animation. The gap
was only that the greeting faded in flatly, so it now takes the same per-word mask reveal
as the landing headline — same language, reused on display type, one moment on mount and
then stillness. Quicker than the landing (32ms stagger, 0.55s) because you meet this
screen far more often. `motion` keeps the `exit` so the dock still works; the entrance is
pure CSS.

**Hydration trap this exposed.** The greeting is a random pick, previously a bare text node
under `suppressHydrationWarning`. That attribute only covers an element's _own text_ — the
moment the greeting became per-word spans, the server/client mismatch turned into a hard
hydration error and React rebuilt the tree. Fixed by making the pick genuinely client-only
via `useSyncExternalStore` (server snapshot `null`, client snapshot the greeting), which
this repo's lint permits where `setState` in an effect does not. Two sub-traps:

- `getSnapshot` must be referentially stable, so the pick is cached at module scope. The
  composer lives in the layout and mounts once per page load, so this matches the old
  per-mount behaviour.
- `subscribe` must nudge once after hydration. With a no-op subscribe React never
  re-renders and keeps serving the server snapshot, so no greeting ever appears — the
  first attempt shipped exactly that bug.

Verified: greeting renders, 9 word masks, 8px clearance top and bottom at 40px type (no
clipping of descenders or the comma), no canvas in the tree, no console errors,
`tsc --noEmit` and ESLint clean.

**Also found, deliberately left alone (in-flight work, not mine):**

- `app/chat/[id]/page.client.tsx:29` reads `useRef(...).current` during render, which this
  repo's ESLint treats as an error — `bun run lint` fails on it. Not in `HEAD`. The
  behaviour-identical fix is `useState(() => (messages?.length ?? 0) > 0)[0]`.
- The metrics widget truncates `MEDIAN TIME-TO-FIRST-TOKE…`.

---

## Sidebar rewamp — stow / peek / pin (2026-09-02)

### Brief

Fully collapsible sidebar. Collapsed → only a floating logo top-left. Hovering the
left edge auto-opens the panel adjacent to that logo; moving away auto-closes.
Open (pinned) state unchanged. Plus: cap page width for ultrawide displays.

### Design plan

**Concept — a latch and a rail.** The app's existing identity is "Station":
instrument-panel vernacular (Archivo signage display, mono readouts, hairlines
instead of borders, brass as the second metal against verdigris). A stowed
instrument leaves a _latch_ — that's the floating logo, a plate that sits flush in
the corner with a hairline, not a glassmorphic pill with a grey drop shadow. The
left screen edge becomes a _rail_: one brass hairline at zero opacity that ignites
as the pointer approaches, so the edge announces itself during the intent delay
rather than after the panel has already moved.

**Color** — no new values. `--sidebar` for the panel, `--hairline` for its edge,
`--brass` for the single signal moment (rail + armed latch ring), `--primary` for
the mark. Palette validator untouched: no surface colour changes.

**Type** — unchanged. The panel is chrome, not a reading surface.

**Motion** — one thing moves: the panel, on a single 300ms
`cubic-bezier(.32,.72,0,1)` decelerate covering left/top/bottom/radius/shadow, so
peek→pin is one continuous gesture rather than a swap. Rail ignition is 150ms
opacity. `motion-reduce` kills both. Nothing else animates on reveal.

**Three states, not two.** `open` is the _pinned_ state and it moves layout.
`peek` is a transient overlay — the panel floats above the content and nothing
reflows, because a pointer brushing the left edge must not shift the text someone
is reading.

```
STOWED                          PEEK (overlay, no reflow)
┌─┬──────────────────────────┐  ┌──┬─────────────────┬──────┐
│▏│                  ⤓  ☾    │  │▐ │ ⇤               │ ⤓ ☾  │
│▏│ ┌──┐                     │  │▐ │ + New chat ⌘⇧O  │      │
│▏│ │◈ │  ← latch (36px)     │  │▐ │ ⌕ Search   ⌘K   │      │
│▏│ └──┘                     │  │▐ │ PAST            │      │
│▏│                          │  │▐ │ · conversation  │      │
│▏│      chat content        │  │▐ │ · conversation  │      │
│▏│                          │  │▐ │                 │      │
│▏│   ┌────────────────────┐ │  │▐ │ ◐ user          │      │
│▏│   │ composer           │ │  │▐ └─────────────────┘      │
└─┴──────────────────────────┘  └──┴────────────────────────┘
 ↑ 16px live edge; brass          ↑ rail lit, panel docked beside
   hairline 0 → 70% on approach     the latch; content does not move
```

| state  | enter                                     | layout         |
| ------ | ----------------------------------------- | -------------- |
| stowed | default when unpinned                     | content full   |
| peek   | mouse in left 16px, or on the latch, 90ms | overlay        |
| stow   | pointer out 220ms · Esc · navigate · pin  | —              |
| pinned | click latch · ⌘B · pin button in peek     | content shifts |

**Reviewed against the brief.** The default answer here is a `rounded-2xl`
backdrop-blur pill with a chevron and a 4px grey hover bar, and peek that pushes
content. Changed three things: the plate is a hairline plate in the app's own
vocabulary; the hover affordance is a brass instrument hairline, not a grey slab;
and peek overlays instead of pushing, which is the difference between a feature
and a twitch.

### Alignment / width

`max-w-3xl` and `max-w-6xl` were scattered literals. Registered two container
tokens so there is one knob each, then capped the chat header — the only uncapped
container in the app, and the actual ultrawide complaint: its actions were flying
to the far screen edge while the transcript stayed a 48rem column in the middle.

- `--container-measure: 48rem` — anything read line-by-line (transcript, composer, chat header)
- `--container-page: 72rem` — full-bleed shells (landing sections, landing nav/footer)

### Tasks

- [x] Read the existing sidebar primitive, nav components, width literals
- [x] Design plan + review against brief
- [x] `components/sidebar-peek.tsx` — peek context, rail, latch, shared mark
- [x] `components/app-sidebar.tsx` — offcanvas + peek geometry, header per state
- [x] Peek locks in `nav-main`/`nav-conversations`/`nav-user`
- [x] Fix the double-bound ⌘B (primitive and AppSidebar both toggled → net no-op)
- [x] Persist the stowed state — `SidebarProvider` wrote `sidebar_state` but nobody read it
- [x] Verify: tsc, eslint, measured in the browser
- [~] Width tokens — built, then **reverted at the user's request**. Every literal is
  back to `max-w-3xl` / `max-w-6xl`; no tokens remain. See the review below.

### Review

**Corrections taken during the work, and what each cost.**

1. _"you just removed the wide limit?"_ — Renaming `max-w-3xl` → `max-w-measure` in the
   same edit that defined `--container-measure` half-applied: Turbopack rebuilt the JS
   but served a CSS chunk from before the `globals.css` edit, so the class resolved to
   nothing and a missing `max-width` is no limit at all. I had called it clean on `tsc`
   and `eslint`, neither of which can see that. Lesson recorded.
2. _"tooltips for new chat and all need to be closed when i close the sidebar"_ — The
   collapsed-state tooltips on New Chat / Search Chats were dead weight the moment the
   sidebar stopped being an icon rail: whenever those buttons are on screen so are their
   labels. On ⌘B the panel slid out from under a hovered trigger and left a portalled
   tooltip stranded over the transcript. Deleted them; the ⌘ hints stay inline. The
   panel-header control keeps a tooltip, gated on the panel actually being on screen.
3. _"sidebar collapsing and closing has a layout shift"_ — Real, and mine. The panel
   slid on 300ms `cubic-bezier(.32,.72,0,1)` while shadcn's `sidebar-gap` — the element
   that pushes the content — stayed on 200ms `linear`. Same boundary to the eye, two
   clocks. Unified both. Two neighbours found the same way: `visibility` in the
   transition list popped the panel in at 50%, replaced with `inert`; and the peek
   panel's 1px border pushed its own mark to (17,17), replaced with `ring-1`.
4. _"why does the hover version open outside of the logo???"_ — I read "adjacent" as
   _beside_ and parked the panel in a column right of the latch, stranding the logo.
   It should unfold _around_ it. Rebuilt: one `SidebarMark` rendered twice — as the
   floating latch and inside the panel header — with the peek panel inset 8px so
   `SidebarHeader`'s 8px pad puts its mark on the latch's exact rect. Verified
   `16,16 36x36` in both states.
5. _"revert whatever global width thing that you did"_ — Done, in full.

**Measured, not eyeballed.** Registration `16,16 36x36` === `16,16 36x36`; gap and panel
both `0.3s cubic-bezier(0.32, 0.72, 0, 1)`; peek gap width `0` (content never reflows);
stowed panel `inert` (was leaking ~60 focusable conversation links into the tab order
off-screen — a regression from moving `icon` → `offcanvas`, now fixed).

**Left alone deliberately.** Four pre-existing lint errors in
`app/chat/[id]/page.client.tsx`, `app/chat/page.client.tsx` and `components/Input.tsx`
— untouched files, not this change's scope. Verified with `tsc --noEmit` + `eslint`
rather than `bun run build`, per the dev-server lesson.

---

## Blur reveal on streaming text (2026-09-02)

- [x] Drive the reveal through Streamdown's own animate plugin rather than a
      hand-rolled tokeniser — it already wraps arriving words and, via
      `setPrevContentLength`, hands words that are already on screen a `0ms`
      duration so the paragraph does not re-blur on every token.
- [x] Word-level, not character-level (`sep: 'word'`): one span per word instead
      of per letter, and a word is the unit the eye resolves anyway.
- [x] Gate it on `msg.isStreaming`. The plugin animates off _mount_, not off
      arrival, so leaving it on would re-blur a whole transcript every time a
      saved conversation is opened.
- [x] Pass `isAnimating` as well as `animated` — see `tasks/lessons.md`.

**Files.** `app/globals.css` (`sd-breezeReveal` keyframe + the `[data-sd-animate]`
rule Streamdown targets), `components/ai-elements/message.tsx` (`animate` prop on
`MessageResponse`), `app/chat/components/chat-messages.tsx` (one call site).

**The reveal.** `opacity 0 → 1` with `blur(5px) → 0`, 300ms, `cubic-bezier(0.22,
0.61, 0.36, 1)`, opacity finishing at 60% so each word _arrives and then sharpens_
rather than cross-fading. No slide, no scale — the brief was blur to no blur.

**Verified in the running app,** not by inspection: mid-stream the DOM carries
`[data-sd-animate]` spans whose computed filter walks `blur(5px) → blur(2.27px) →
blur(0.99px) → 0`, ~35–55 words in flight at the leading edge, and the wrapper
spans are gone once `isStreaming` flips (settled messages are plain text again).
Code, `pre`, `svg` and math are skipped by the plugin, so `breeze-ui` fences and
shiki blocks are untouched.

**Reduced motion** needs nothing new — the existing global `prefers-reduced-motion`
block collapses `animation-duration`, and the keyframe's end state is the sharp one.

**Left alone.** Reasoning panels still render unanimated (secondary, usually
collapsed), and the three pre-existing lint errors in `app/chat/page.client.tsx`
and `app/chat/[id]/page.client.tsx` are untouched files.
