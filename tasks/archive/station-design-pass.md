# Design pass: "Station" — landing page + platform

Applying the `frontend-design` skill (anthropics/skills) to Breeze.

## Brief

**Subject:** Breeze, a self-hosted AI chat app. **Audience:** developers who already run
things on their own hardware. **The page's one job:** earn architectural trust fast, then
send them to the repo or the app.

## Direction — "Station"

A weather station / instrument panel. Breeze's world is air (the name) and local hardware
(Ollama on localhost). A weather station is the artifact where those meet: an unglamorous
box that sits in one place, takes its own readings, and reports only what it measures.
That is literally the product.

### Color — 6 named values

| token       | value     | role                                                       |
| ----------- | --------- | ---------------------------------------------------------- |
| `paper`     | `#EAEEEC` | pale cool ground, faintly green-grey. Not cream, not white |
| `ink`       | `#132B2A` | deep slate-teal text. Never pure black                     |
| `verdigris` | `#3FA394` | primary. Kept from the existing product for continuity     |
| `brass`     | `#B08343` | instrument brass. Marks egress **only**. The risk          |
| `haze`      | `#9AA8A5` | hairlines, mono labels                                     |
| `night`     | `#0C1918` | dark ground — deep teal-black, not neutral black           |

### Type — 3 roles

- **Display:** Archivo variable, `wdth` axis set expanded + tight tracking — gauge-face and
  station-signage lettering. Not a serif, not Inter.
- **Body:** Manrope. Kept. It already carries the app; changing it is churn, not design.
- **Utility:** Geist Mono. Kept. Every reading, label and boundary marker is mono, because
  in this world data is monospaced.

Removes `Satisfy` (script wordmark) — "handwritten = friendly" is the one generic move in
the current identity and it fights the instrument direction.

### Layout

Left-aligned hero. No centred badge stack, no gradient blob. Hairline rules with mono
eyebrows in the left margin. No `01 / 02 / 03` markers except in setup, which genuinely
is a sequence.

### Signature — the boundary

A dashed rule labelled `YOUR MACHINE` above / `THE INTERNET` below. Every capability is
placed on the honest side of it, including web search sitting _outside_, marked `OPT-IN`.
One ambient wind-field canvas drifts across the boundary; the message rows never do.
It is an argument, not a decoration.

### Critique pass

- Particle canvases are an AI-design cliché. Kept only because here it is the medium the
  boundary cuts through, it is the page's _only_ animation, and it is low-contrast, slow,
  and off under `prefers-reduced-motion`.
- Teal + brass is the justified risk. The default would be teal-and-nothing, or the
  near-black + acid-green look the skill calls out.

## Honesty fixes (code contradicts current copy)

- `backend/app.py:33` points the OpenAI SDK at `ollama_base_url` — chat **and**
  summarisation are local. Current claim "no cloud dependencies" is ~right for inference.
- Langfuse tracing **does** send data out, so today's "no telemetry, no data collection"
  is false. Rewritten.
- Tavily web search is the one genuine egress, default-off (`components/Input.tsx`).
- `nav-user.tsx` ships fake "Upgrade to Pro" / "Billing" / "Notifications" in a
  self-hosted OSS app. Replaced with real destinations.

## Tasks

- [x] `app/globals.css` — Station palette (light + dark), display font var, hairline utils
- [x] `app/layout.tsx` — load Archivo variable; metadata copy
- [x] `components/station/wind-field.tsx` — signature canvas, reduced-motion aware
- [x] `app/page.tsx` — new hero: statement + instrument readout panel
- [x] `app/landing-sections.tsx` — boundary diagram, 2-col index, setup, shortcuts, close
- [x] `app/chat/components/chat-header.tsx` — wordmark
- [x] `components/nav-user.tsx` — honest menu
- [x] `app/chat/utils/constants.ts` — empty-state copy that invites action
- [x] `app/[auth]/page.tsx`, `login-form`, `signup-form` — station treatment + copy
- [x] `components/ai-elements/conversation.tsx` — empty-state heading takes the display face
- [x] Verify: eslint clean on changed files, `bun run build` passes
- [x] Reviewed in browser: landing light + dark, desktop + mobile
- [ ] **Not reviewed in browser: the signed-in app** (`/chat` is behind auth). Palette,
      wordmark, empty state and user menu changes there are build- and lint-verified only.
- [ ] `components/app-sidebar.tsx` — left alone; its logo is the SVG mark, no type to change

## Review

**What shipped.** A single direction — "Station" — applied to the landing page and carried
into the app through shared tokens rather than page-local styling. The palette, the display
face and the three instrument classes (`type-display`, `eyebrow`, `readout`) live in
`globals.css`, so the chat UI inherits the identity without each screen being restyled by hand.

**The risk I took.** Brass against verdigris, and brass marks exactly one concept: egress.
Nothing else on the site is warm. It stays legible as a signal because it is never used
decoratively.

**Two false claims found and removed.**

1. The old copy said "no telemetry, no data collection." Langfuse tracing contradicts that,
   so the boundary diagram now lists tracing on the outside, marked _unset by default_.
2. I had written a "Voice mode" capability and a `/voice` menu link from CLAUDE.md's
   description. `app/voice/` contains only empty directories and `backend/voice.py`,
   `tts.py` and `stt.py` do not exist — the feature is not in the tree. Both were removed.
   **CLAUDE.md still documents voice mode as if it ships, and is wrong about summarisation
   going to OpenAI** (`backend/app.py:33` points the SDK at `ollama_base_url`). Worth fixing.

**Judgement calls.**

- Removed `Satisfy`, the script wordmark. "Handwritten = friendly" was the one generic move
  in the old identity and it fought the instrument direction. Reversible in one class.
- Global radius 0.625rem → 0.5rem. Small, but it is what makes the UI read as engineered.
- `whileInView` reveals changed from `once: false` to `once: true`. Re-animating on every
  scroll past was noise.
