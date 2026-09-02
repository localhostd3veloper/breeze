# FastAPI backend, installed with uv against the committed uv.lock.
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Dependencies first, in their own layer, so editing a .py file does not
# re-resolve the lockfile.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

COPY . .

EXPOSE 8000
# No --reload: this is the production entrypoint. `python main.py` is the dev one.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
