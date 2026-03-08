# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Package manager:** Bun (use `bun` instead of `npm` for installs)

```bash
# Frontend
bun run dev          # Start Next.js dev server (port 3000)
bun run build        # Production build
bun run lint         # ESLint check
bun run lint:fix     # Auto-fix lint issues

# Backend (FastAPI)
cd backend && python main.py    # Start FastAPI server (port 8000)
# or: cd backend && uvicorn app:app --reload
```

No test runner is configured.

## Architecture Overview

Full-stack AI chat app: **Next.js 16 (App Router) frontend** → **FastAPI backend** → **Ollama (local LLM)** + **OpenAI (summarization)**, persisted in **MongoDB**.

### Data Flow

```bash
Browser → Next.js API routes → FastAPI backend → Ollama/OpenAI
                ↓
           MongoDB (Mongoose)
```

Next.js API routes act as an authenticated passthrough to FastAPI — they add auth headers (`X-API-Key`) and handle CRUD for conversations/messages in MongoDB directly on the Nextjs App. Fastapi is a separate entity for Ollama Calls.
The Params: ( `X-User-Id`, `X-Session-Id`) are for langfuse tracing

### Message State Architecture

Messages live **exclusively in TanStack Query** cache under key `['conversations', id, 'messages']`. Zustand holds only `isAuthenticated`. Never put messages in Zustand.

- `staleTime: Infinity` prevents cache invalidation during active streams
- `isStreaming: true` on `ChatMessageDTO` = client-only in-flight marker (never from DB)
- `useChatStream` in [app/chat/hooks/useChatStream.ts](app/chat/hooks/useChatStream.ts) orchestrates: create conversation → optimistic cache update → stream → persist to DB

### Streaming Protocol

Backend emits NDJSON. Each line is a `StreamEvent` (see [lib/types/stream.ts](lib/types/stream.ts)):

```ts
{ type: 'text' | 'reasoning' | 'done' | 'error', content: string }
```

`/api/chat` (Next.js) is a pure proxy to FastAPI `/completion`. `useChatStream` parses the NDJSON via `AsyncGenerator`.

### Persistence Pattern

- User message: saved via fire-and-forget `POST /api/conversations/:id/messages`
- Assistant message: accumulated in TanStack cache during stream, saved to DB after `done` event
- On stream complete: invalidates `['conversations']` to refresh sidebar

### Authentication

NextAuth 4 with Credentials provider (email/bcrypt). JWT session strategy. Server-side `getServerSession(authOptions)` gates all API routes. `lib/auth.ts` is the single source of auth config.

### Backend (FastAPI)

Located in `backend/`. Key endpoints:

| Endpoint           | Description                                       |
| ------------------ | ------------------------------------------------- |
| `POST /completion` | Stream LLM response (NDJSON), rate-limited 10/min |
| `POST /summarize`  | Generate conversation title, rate-limited 20/min  |

Auth: `X-API-Key` header verified against env var. Langfuse integration for LLM observability. MCP + Tavily for web search tools.

## Environment Variables

**Frontend** (`.env.local`):

```bash
OLLAMA_API_URL=      # FastAPI backend URL
OLLAMA_API_KEY=      # Shared secret for backend X-API-Key
MONGO_URI=           # MongoDB Atlas connection string
NEXTAUTH_SECRET=     # JWT secret
NEXTAUTH_URL=        # App URL
PLATFORM_PASSWORD=   # Demo account password
```

**Backend** (`backend/.env`):

```bash
API_KEY= # FastAPI X-API-Key
TAVILY_API_KEY= # Tavily API key web search

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=
```

## Key Files

- [app/chat/hooks/useChatStream.ts](app/chat/hooks/useChatStream.ts) — core streaming + persistence
- [app/api/chat/route.ts](app/api/chat/route.ts) — passthrough to FastAPI
- [hooks/use-chat-messages.ts](hooks/use-chat-messages.ts) — TanStack Query message hook
- [lib/auth.ts](lib/auth.ts) — NextAuth config + credential verification
- [lib/db/mongodb.ts](lib/db/mongodb.ts) — pooled Mongoose connection
- [lib/models/](lib/models/) — Mongoose schemas (User, Conversation, ChatMessage)
- [lib/types/stream.ts](lib/types/stream.ts) — StreamEvent union type
- [backend/app.py](backend/app.py) — FastAPI routes
- [backend/chat.py](backend/chat.py) — LLM streaming logic

## UI Stack

shadcn/ui (Radix-based) + Tailwind CSS 4. Markdown rendered with `streamdown`. Code highlighted with `shiki`. Toasts via `sonner`. Animations via `motion`.
