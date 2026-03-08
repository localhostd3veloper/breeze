# Breeze

A full-stack AI chat app with streaming responses, web search, vision, and extended thinking. Built on Next.js 16 + FastAPI, powered by local Ollama models.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TanStack Query, shadcn/ui, Tailwind CSS 4
- **Backend**: FastAPI, Python 3.13+, Ollama (local LLM), OpenAI-compatible API
- **Database**: MongoDB (Mongoose)
- **Auth**: NextAuth 4 (Credentials + JWT)
- **Observability**: Langfuse

---

## System Requirements

### Recommended (reference hardware)

- **CPU**: Intel i9-13800HX or equivalent
- **GPU**: NVIDIA RTX 4060 with 8 GB VRAM (CUDA) — required for running local models at reasonable speed
- **RAM**: 32 GB system RAM
- **Storage**: ~20 GB free for Ollama model weights

### Minimum

- **GPU**: 6 GB VRAM (some models may not fit; reduce to smaller variants)
- **RAM**: 16 GB
- **CPU**: Any modern 8-core CPU (inference will be slow without GPU)

### Software

- [Ollama](https://ollama.com) installed and running
- [Bun](https://bun.sh) (frontend package manager)
- Python 3.13+ with [uv](https://github.com/astral-sh/uv) or pip
- MongoDB Atlas account (or local MongoDB)

---

## Ollama Models

Pull the models used by the backend before starting:

```bash
ollama pull phi4-mini:3.8b    # default + summarize
ollama pull llava:7b           # vision
ollama pull qwen3:8b           # thinking / extended reasoning
ollama pull qwen2.5:7b         # web search
```

> Model selection is configured in `backend/models_config.py` — edit that file to swap models.

---

## Installation

### 1. Clone the repo

```bash
git clone <repo-url>
cd breeze
```

### 2. Frontend

```bash
bun install
```

Create `.env.local` in the project root:

```bash
OLLAMA_API_URL=http://localhost:8000   # FastAPI backend URL
OLLAMA_API_KEY=your-shared-secret      # Must match backend API_KEY
MONGO_URI=mongodb+srv://...            # MongoDB Atlas connection string
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
PLATFORM_PASSWORD=demo-password        # Password for demo account
```

### 3. Backend

```bash
cd backend
```

Install dependencies (using uv):

```bash
uv sync
```

Or with pip:

```bash
pip install -r <(uv export --no-hashes)
# alternatively: pip install fastapi uvicorn langfuse openai ollama slowapi tavily-python python-dotenv pydantic mcp tavily-mcp
```

Create `backend/.env`:

```bash
API_KEY=your-shared-secret        # Must match frontend OLLAMA_API_KEY

TAVILY_API_KEY=                   # Tavily API key (for web search)

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=
```

> Langfuse and Tavily are optional — the app works without them, but web search and LLM tracing will be unavailable.

---

## Running

Start all three services (each in a separate terminal):

```bash
# 1. Ollama (if not already running)
ollama serve

# 2. FastAPI backend (from /backend)
cd backend && uvicorn app:app --reload --port 8000

# 3. Next.js frontend (from project root)
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```text
breeze/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # Auth, conversations, chat proxy
│   └── chat/               # Chat UI + useChatStream hook
├── backend/                # FastAPI service
│   ├── app.py              # Routes (/completion, /summarize)
│   ├── chat.py             # LLM streaming + tool calling
│   ├── models_config.py    # Model selection configuration
│   └── tools.py            # Web search tools (Tavily/MCP)
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── db/                 # MongoDB connection
│   ├── models/             # Mongoose schemas
│   └── types/stream.ts     # NDJSON StreamEvent types
└── hooks/                  # Shared React hooks
```

---

## Features

- **Streaming chat** via NDJSON with real-time token rendering
- **Web search** powered by Tavily (automatic when user asks about recent events)
- **Vision** — attach images to messages (uses llava)
- **Extended thinking** — step-by-step reasoning mode (uses qwen3)
- **Conversation history** with auto-generated titles (via OpenAI-compatible API)
- **Dark/light mode**, markdown + code highlighting, math, Mermaid diagrams
