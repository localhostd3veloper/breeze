# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (Next.js on port 3000)
bun build        # Production build
bun start        # Start production server
bun lint         # Run ESLint
bun lint:fix     # Run ESLint with auto-fix
```

## Required Environment Variables

Set in `.env.local`:

| Variable            | Description                        |
| ------------------- | ---------------------------------- |
| `MONGO_URI`         | MongoDB connection string          |
| `NEXTAUTH_SECRET`   | Secret for NextAuth JWT signing    |
| `OLLAMA_API_URL`    | URL of the self-hosted LLM backend |
| `OLLAMA_API_KEY`    | API key for the LLM backend        |
| `PLATFORM_PASSWORD` | Platform-level password            |

Env vars are validated at startup via Zod in [lib/env.ts](lib/env.ts) — the app will throw if any are missing.

## Architecture

**Breeze** is a Next.js 16 App Router chat application that wraps a self-hosted Ollama-compatible LLM backend. Key architectural decisions:

### Request Flow

1. Client submits a message via `useChatStream` hook
2. Hits `/api/chat` (Next.js route) which proxies the request to `OLLAMA_API_URL/completion`
3. Streams the response back as plain text
4. Client appends chunks to the Zustand store

### Auth

- NextAuth v4 with credentials provider (email + password)
- Passwords hashed with bcryptjs
- JWT session strategy; `session.user.id` is injected from the token
- Route protection is handled in [proxy.ts](proxy.ts) via Next.js middleware — `/chat/*` requires a valid JWT
- Auth pages: `/login`, `/signup` (dynamic route `app/[auth]/page.tsx`)

### Data Layer

- **MongoDB** via Mongoose, connected in [lib/db/mongodb.ts](lib/db/mongodb.ts) using a global cached connection to survive hot reloads
- Models: `User`, `Conversation`, `ChatMessage` in [lib/models/](lib/models/)
- `dbConnect()` is called in the root layout so the connection is ready for all server components

### State Management

- **Zustand** store ([store/chat.ts](store/chat.ts)) persisted to `localStorage` under key `breeze-chat` — holds messages and auth state
- **TanStack Query** wraps client-side data fetching (e.g. polling chat health every 10s)

### UI

- [components/ui/](components/ui/) — shadcn/ui primitives
- [components/ai-elements/](components/ai-elements/) — rich chat rendering components (code blocks, artifacts, reasoning, canvas, etc.)
- [components/app-sidebar.tsx](components/app-sidebar.tsx) — sidebar with conversation list and user nav
- Tailwind CSS v4 with `tw-animate-css` and `next-themes` for dark mode
- Fonts: Manrope (sans) and Geist Mono (mono)

### Path Aliases

`@/` maps to the project root (configured in `tsconfig.json`).
