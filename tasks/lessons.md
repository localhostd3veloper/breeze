# Lessons

## Never run `bun run build` while the dev server is up

**What happened (2026-09-02):** The user started `next dev` and asked me to inspect
localhost:3000. I ran `bun run build` to verify a change; the production build wrote into
the same `.next/` directory `next dev` was serving from and killed their server mid-review.

**Rule:** If a dev server is running on this project, verify with `bunx tsc --noEmit` and
`bunx eslint <files>` instead. Only run `bun run build` after confirming no dev server is
live (`curl -sf localhost:3000` / `pgrep -f "next dev"`), or accept that I must restart it.

## Check whether a documented feature actually exists before writing copy about it

**What happened:** I wrote a "Voice mode" landing-page feature and a `/voice` menu link
from CLAUDE.md's description. `app/voice/` held only empty directories and the backend
`voice.py`/`tts.py`/`stt.py` did not exist.

**Rule:** CLAUDE.md and git status describe intent, not the tree. Before any user-facing
claim, confirm the route builds and the handler exists. `find <dir> -type f`, not `ls <dir>`
— empty directories look like a present feature.

## Re-run the palette validator after touching any surface colour

**What happened:** Desaturating the theme lightened `--background`, which silently pushed
dark violet to 2.97:1 — under the 3:1 gate `tasks/chart-design.md` asserts for all six
dark slots.

**Rule:** `--background` and `--card` are inputs to the chart contrast checks. Any change to
them means re-running `scripts/validate_palette.js` for both modes and updating the doc's
recorded surfaces.

## Splitting a text node into spans can expose a flex `gap`

**What happened:** `TooltipTrigger` had `flex gap-1` with the single text node `Breeze.`,
so the gap had nothing to act on. Splitting the period into `<span>` made it a visible
"Breeze ." space.

**Rule:** Before wrapping part of a text node in an element, check the parent for `flex`/
`grid` plus `gap`, or `space-x-*`.

## A new Tailwind theme token fails silently, and tsc/eslint cannot see it

**What happened (2026-09-02):** I swapped `max-w-3xl` → `max-w-measure` in the same
edit that defined `--container-measure` in `@theme inline`. Turbopack rebuilt the JS
but kept serving a cached CSS chunk from before the `globals.css` edit, so
`max-w-measure` had no rule — and a missing `max-width` is not an error, it is _no
limit at all_. The transcript went edge-to-edge on an ultrawide monitor. I had
reported the change clean on the strength of `tsc --noEmit` and `eslint`, neither of
which can see a class that resolves to nothing. The user caught it in the browser.

**Rule:** Renaming a utility to one backed by a brand-new `@theme` token is a
two-part change that can half-apply. Before claiming it works:

1. Prove the utility exists — `bunx @tailwindcss/cli -i app/globals.css -o <scratch>`
   then grep the output for the rule (it is pretty-printed, so `grep -A2 '\.max-w-x'`,
   not `grep -o '\.max-w-x[^}]*}'`, which is line-scoped and gives a false negative).
2. Restart the dev server, or verify against the served CSS chunk rather than
   assuming HMR picked up `@theme`.

More generally: layout classes that silently no-op (`max-w-*`, `w-*`, `grid-cols-*`)
are invisible to the type checker and the linter. If a change is only observable in
pixels, verify it in pixels.

## A clarifying question can't surface an error both options already share

**What happened (2026-09-02):** The brief said the collapsed sidebar should show a
floating logo and the panel should "open adjacently". I read _adjacent_ as **beside**,
asked which corner the logo went in, and drew both ASCII options with the panel in a
column to the _right_ of the logo. The user picked one, so I shipped that reading — and
it was wrong. They meant the panel **unfolds around** the logo: same pixel, panel grows
out of the plate. Both of my options encoded the same wrong assumption, so the question
confirmed the corner and validated nothing.

**Rule:** When asking to resolve ambiguity, the options must differ **on the ambiguous
axis itself**, not on a parameter downstream of it. Before offering a choice, name the
assumption each option shares — if they share the thing that is actually uncertain, the
question is worthless. For spatial/motion briefs specifically, the axis is usually
_does element A move, contain, or sit beside element B_ — ask that, not which corner.

## Two edges that read as one object need the same duration AND the same easing

**What happened (2026-09-02):** I gave the sidebar panel a 300ms
`cubic-bezier(.32,.72,0,1)` slide but left shadcn's `sidebar-gap` — the element that
pushes the content — on its stock `200ms linear`. Both edges are the same boundary to
the eye, so the content tore away from the panel mid-slide and arrived 100ms early. The
user reported it as a layout shift. Neither `tsc` nor `eslint` can see it, and a static
screenshot cannot either — only the computed styles side by side, or the motion itself.

**Rule:** When a change animates one half of a pair that moves as a single object,
diff `getComputedStyle(...).transitionDuration` and `transitionTimingFunction` on both
and assert they match. Related: `visibility` in a `transition-[...]` list interpolates
**discretely at 50%**, so it pops the element in halfway through the slide — for taking
something out of the tab order mid-animation use the `inert` attribute, which touches no
animatable property. And a 1px `border` on an animated panel shifts its contents by a
pixel; use `ring-*` (a box-shadow) when inner elements must stay registered.

## This repo lints React 19's hook rules — write derivations, not effects

**What happened (2026-09-02):** Three of my own edits shipped patterns the linter
rejects: `useEffect(() => setMode('images', hasImages), [...])` in
`components/Input.tsx`, `useEffect(() => { ...; setIsReset(true) }, [])` in
`app/chat/page.client.tsx`, and `useRef(expr).current` read during render in
`app/chat/[id]/page.client.tsx`. All three compile and all three run, so nothing
surfaced until `bun run lint` — which I had not run.

**Rule:** `react-hooks/set-state-in-effect` and `react-hooks/refs` are errors here.
An effect whose body is a `setState` is a derivation wearing the wrong hook. Three
replacements, in order of preference:

1. **Derive it** — compute from the values you already have, no state at all.
2. **Adjust during render** on an edge, when there is no callback to hang it off
   (`if (prev !== next) { setPrev(next); setThing(next); }`). React re-runs before
   committing, so nothing paints stale.
3. **Move the write to where the staleness is created**, not where it is observed —
   `/chat` clearing the pending key on _unmount_ removed the flag it existed to gate.
   For "capture the first-render value", `useState(() => expr)[0]` is the lint-clean
   `useRef(expr).current`. And run `bun run lint` before calling a UI change done —
   `bun run build` passes all of these.

## Streamdown: `animated` is inert without `isAnimating`
**What happened (2026-09-02):** Asked for a blur reveal on streaming text, I wired
Streamdown's own animate plugin (`animated={{ animation, sep, duration, easing }}`)
and shipped it after `tsc` and `eslint` passed. It did nothing — *"it was really
abrupt. happens really fast. without any blur animation."* The prop is real and
type-checks, but in `streamdown@2.4` the rehype plugin is only appended under
`ge && m` — i.e. `animated` **and** `isAnimating`, whose default is `false`. One
truthy prop, zero effect, no warning.

**Rule:** A typed prop being accepted is not evidence the feature is on. For any
library behaviour that is invisible when it silently no-ops, verify against the
**DOM the library is supposed to produce**, not against the props you passed:
`document.querySelectorAll('[data-sd-animate]').length` would have read 0 on the
first try. Two supporting habits:
- Sample with `setInterval`, not `requestAnimationFrame` — a rAF recorder in a
  non-foreground tab records nothing, which looks identical to "the feature is off"
  and cost me a diagnostic round.
- Read the dist bundle when the types run out. The gate was one `&&` in
  `chunk-*.js`; no `.d.ts` or README states it.

Same shape as the lint lesson above: the thing that compiles is not the thing that runs.
