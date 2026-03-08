# Contributing to Breeze

Thanks for your interest in contributing! Breeze is an open-source AI chat app and we welcome contributions of all kinds.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager)
- [Python 3.11+](https://python.org) (backend)
- [MongoDB](https://mongodb.com) or MongoDB Atlas account
- [Ollama](https://ollama.ai) running locally

### Local Setup

```bash
# Clone the repo
git clone https://github.com/localhostd3veloper/breeze.git
cd breeze

# Install frontend dependencies
bun install

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Install backend dependencies
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit backend/.env with your values

# Start Ollama (in a separate terminal)
ollama serve

# Start the backend (in a separate terminal)
cd backend && python main.py

# Start the frontend dev server
bun run dev
```

The app will be available at `http://localhost:3000`.

## How to Contribute

### Reporting Bugs

Open an issue with:
- A clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or logs if applicable

### Suggesting Features

Open an issue tagged `enhancement` with:
- The problem you're solving
- Your proposed solution
- Any alternatives you considered

### Submitting a Pull Request

1. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes, keeping commits focused and atomic.
3. Run lint checks before pushing:
   ```bash
   bun run lint
   ```
4. Open a PR against `main` with a clear description of what changed and why.
5. Link any related issues in the PR description.

## Code Style

- **Frontend**: TypeScript, Tailwind CSS 4, shadcn/ui components. Follow existing file and component patterns.
- **Backend**: Python, FastAPI. Keep endpoints thin — logic lives in `chat.py` / `summarize.py`.
- Avoid unnecessary abstractions. Keep changes minimal and focused.
- No new dependencies without discussion in an issue first.

## Architecture Notes

See [CLAUDE.md](./CLAUDE.md) for a full architecture overview including data flow, streaming protocol, and key file locations.

## Community

Be kind, constructive, and respectful. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.
