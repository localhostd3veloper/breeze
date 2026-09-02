# Implementation brief: generative UI (for the implementing agent)

Implement generative UI for Breeze: the assistant can render charts, stat tiles, cards,
tabs and tables inline in a chat message instead of only prose.

**Read `tasks/todo.md` first -- it is the agreed spec**, and `tasks/chart-design.md`
before writing any chart code. Follow it. The design decisions in
it are settled; do not re-litigate the format, the model routing, or the component set.
Work through its task list and tick items off as you go.

This brief adds the context and constraints behind that plan.

---

## The core mechanism

The model emits a fenced code block in its normal text output:

````
```breeze-ui
{ "type": "chart", "variant": "bar", "title": "...", "data": [...] }
```
````

A custom Streamdown `code` renderer intercepts `language-breeze-ui`, validates the JSON
with zod against a **closed whitelist** of widget types, and renders real React.

**The model emits data, never JSX.** This is the security property of the whole design.

## Non-negotiables

1. **No code evaluation, ever.** Do not use `react-jsx-parser` (it is in `package.json` and
   `components/ai-elements/jsx-preview.tsx` exists -- ignore both, they are not part of
   this). No `dangerouslySetInnerHTML`. No dynamic component lookup from model-supplied
   strings outside a compile-time-known map. An unrecognised `type` renders as collapsed
   JSON, not as anything executable.

2. **Do not change the transport.** `lib/types/stream.ts`, `app/api/chat/route.ts`, the
   Mongoose schema in `lib/models/chat-message.ts`, and the message API routes must all
   stay as they are. The fence rides inside the assistant's `content`, which is why this
   persists across reloads for free. If you find yourself adding a stream event type or a
   DB field, stop -- you have taken a wrong turn.

3. **The prose-only path must stay behaviourally identical to `main`.** Everything runs
   through `backend/chat.py:stream_response`, which is dense. Add the UI branch alongside
   it without perturbing the existing reasoning parser, tool-call accumulation, or the
   two-pass web-search flow.

4. **It must work with no new credentials.** The strong model is configured by env vars
   that default to the existing local Ollama setup. `git clone && bun dev` keeps working.

## Things you will otherwise get wrong

- **The chart palette is already solved for you -- do not invent one.** Read
  `tasks/chart-design.md`. It contains a validated six-slot categorical palette for both
  light and dark, derived from the Station tokens and checked with the vendored validator
  at `scripts/validate_palette.js`. `--chart-1..5` in `app/globals.css` is a _sequential_
  ramp (four teals + brass) and is wrong for categorical series -- keep it for
  magnitude/ordered data only. If you change any hex, re-run the validator for **both**
  modes. Note the one non-dismissable obligation: in light mode, brass and moss fall
  below 3:1 on paper, so those series need visible direct labels or a table view.

- **Streamdown exports `useIsCodeFenceIncomplete`.** Use it. While the fence is still
  arriving mid-stream the JSON will not parse, and the correct response is a skeleton
  that resolves into the widget -- not an error flash, and not a widget that flickers as
  it rebuilds on every token.

- **`MessageResponse` in `components/ai-elements/message.tsx` already passes a `plugins`
  object** including `@streamdown/code`, which provides shiki highlighting. Your `code`
  override must **compose** with that, not replace it: every fence that is not
  `breeze-ui` must still highlight exactly as it does today. Verify with a normal

  ```ts fence.

  ```

- **`MessageResponse` is `memo`'d with a comparator that only compares `children`.**
  Make sure widgets still update correctly as the fence fills in during streaming.

- **The Station design language is established** (see `tasks/archive/station-design-pass.md`).
  Widgets are instrument panels, not generic dashboard cards: mono labels via the
  `.eyebrow` and `.readout` classes, hairline rules via `--hairline`, `--radius` is
  0.5rem, and **brass is reserved for one meaning -- attention/egress**. Do not spend it
  decoratively. Charts should look like they belong to this app, not to shadcn's demo page.

- **Animation budget: one entrance transition per widget**, staggered ~40ms, via `motion`
  (already installed). Nothing loops, nothing pulses. Respect `prefers-reduced-motion`.
  The landing page's wind-field canvas is deliberately the app's only ambient motion.

## Where the quality actually comes from

`backend/genui_prompt.py` -- the spec grammar plus 2–3 few-shot examples -- determines
whether this feature feels magical or broken, far more than the component code does.
Invest there. Keep the zod schema **small and flat**: every optional field is another
field the model can get wrong, and reliability beats expressiveness.

## Verification -- the work is not done until this passes

Do this in order. Do not skip to the end-to-end test.

1. `bun run lint` and `bun run build` clean.
2. **Deterministic render pass, before involving any model.** Build a fixture of
   hand-written fences covering every widget type _and_ every failure mode: truncated
   JSON, unknown `type`, empty data array, a single data point, 40 table rows, absurdly
   long labels, a number where a string belongs. Debugging a flaky renderer and a flaky
   model simultaneously is how this stalls.
3. Screenshot light + dark, desktop + mobile.
4. Reload a conversation containing widgets -- it must re-render identically from Mongo.
   This is the entire justification for the fence format; if it fails, the format bought
   nothing.
5. Only then, end-to-end with a real model: confirm a mid-stream fence resolves from
   skeleton to widget without flicker.
6. Confirm the prose-only path is unchanged from `main` -- diff the behaviour, not just
   the code.

Report honestly what you verified versus what you only assumed. If something is broken or
unfinished, say so plainly rather than describing it as complete.

## Finally

Update `CLAUDE.md`: the new env vars, the `breeze-ui` fence contract, and the second model
client. Note that CLAUDE.md is **already wrong** on two counts -- it documents a voice mode
that does not exist in the tree, and it claims summarisation goes to OpenAI when
`backend/app.py` points the SDK at Ollama. Fix those in the same pass.

Write your review into the `## Review` section of `tasks/todo.md` when done.
