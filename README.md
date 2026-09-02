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
- **GPU**: NVIDIA RTX 4060 with 8 GB VRAM (CUDA) -- required for running local models at reasonable speed
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

## Quick start

Ollama runs on your **host** (so it keeps your GPU with no passthrough config);
everything else runs in Docker.

```bash
git clone <repo-url>
cd breeze
./setup.sh
```

That is the whole setup. `setup.sh` checks Docker, writes a `.env` with freshly
generated secrets, verifies Ollama is reachable _from inside a container_, pulls
any missing models, then builds and starts the stack. It is idempotent -- re-run
it whenever you want.

When it finishes it prints the app URL and the generated demo password.

### One thing Ollama needs

Ollama binds `127.0.0.1` by default, and containers cannot reach loopback --
they arrive from the Docker bridge. `setup.sh` detects this and stops with
instructions, but for reference:

```bash
sudo systemctl edit ollama
#   [Service]
#   Environment="OLLAMA_HOST=0.0.0.0"
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

On macOS / Windows: Ollama Desktop → Settings → "Expose Ollama to the network".

### Day-to-day

```bash
docker compose up -d          # start
docker compose logs -f        # follow logs
docker compose down           # stop
docker compose down -v        # stop and drop the database volume
docker compose up -d --build  # rebuild after code changes
```

---

## Configuration

One file, `.env` at the repo root, created from [.env.example](.env.example).
`docker-compose.yml` fans it out to each service under the name that service
expects -- which is why the shared frontend/backend secret is written once as
`BREEZE_API_KEY` rather than twice.

| Variable                    | Required | Notes                                                        |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `BREEZE_API_KEY`            | yes      | Shared secret; becomes `OLLAMA_API_KEY` and `API_KEY`        |
| `NEXTAUTH_SECRET`           | yes      | Signs NextAuth JWTs                                          |
| `PLATFORM_PASSWORD`         | yes      | Demo account password                                        |
| `MONGO_URI`                 | no       | Defaults to the `mongo` service; set it to use Atlas instead |
| `OLLAMA_BASE_URL`           | no       | Defaults to `http://host.docker.internal:11434/v1`           |
| `NEXTAUTH_URL` / `APP_PORT` | no       | Change both together if port 3000 is taken                   |
| `TAVILY_API_KEY`            | no       | Without it, search falls back to a keyless DuckDuckGo scrape |
| `LANGFUSE_*`                | no       | Blank disables tracing                                       |
| `UI_MODEL_*`                | no       | Blank keeps generative UI on local Ollama                    |

`setup.sh` generates the three required values for you.

---

## Services

| Service    | Image                           | Port            | Notes                                   |
| ---------- | ------------------------------- | --------------- | --------------------------------------- |
| `frontend` | built from `Dockerfile`         | 3000            | Next standalone build, runs on Node     |
| `backend`  | built from `backend/Dockerfile` | 127.0.0.1:8000  | FastAPI via uv; `/health` healthcheck   |
| `mongo`    | `mongo:8`                       | 127.0.0.1:27017 | Named volume `mongo-data`               |
| Ollama     | --                              | host :11434     | **Not** containerised; runs on the host |

Backend and Mongo are published on loopback only. The frontend waits for both
to report healthy before it starts.

---

## Ollama models

`setup.sh` pulls whatever is missing. To do it separately, run `./install.sh`:

```bash
ollama pull phi4-mini:3.8b   # default + summarize
ollama pull gemma3:12b       # vision + generative UI
ollama pull qwen3:8b         # thinking
ollama pull qwen2.5:7b       # web search
```

> Model selection lives in [backend/models_config.py](backend/models_config.py).
> If you change it, update `REQUIRED_MODELS` in `setup.sh` to match.

---

## Running without Docker

For frontend work with hot reload, three terminals:

```bash
# 1. Ollama
ollama serve

# 2. Backend  (needs `uv sync` once, and a backend/.env with API_KEY=...)
cd backend && uv run uvicorn app:app --reload --port 8000

# 3. Frontend  (needs `bun install` once, and a .env.local -- note the
#    different variable names: OLLAMA_API_URL, OLLAMA_API_KEY, MONGO_URI,
#    NEXTAUTH_SECRET, NEXTAUTH_URL, PLATFORM_PASSWORD)
bun install && bun run dev
```

The container path uses the single root `.env`; this path uses the original
two-file `.env.local` + `backend/.env` layout.

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
- **Vision** -- attach images to messages (uses llava)
- **Extended thinking** -- step-by-step reasoning mode (uses qwen3)
- **Conversation history** with auto-generated titles (via OpenAI-compatible API)
- **Dark/light mode**, markdown + code highlighting, math, Mermaid diagrams
