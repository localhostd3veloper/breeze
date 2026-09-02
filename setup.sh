#!/usr/bin/env bash
#
# Breeze first-run setup.
#
#   ./setup.sh            preflight, write .env, pull models, build, start
#   ./setup.sh --no-start just get the machine ready; don't start containers
#
# Everything here is idempotent -- run it again any time.

set -euo pipefail
cd "$(dirname "$0")"

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; DIM=$'\033[2m'; BLD=$'\033[1m'; RST=$'\033[0m'
ok()   { printf '  %s✓%s %s\n' "$GRN" "$RST" "$1"; }
warn() { printf '  %s!%s %s\n' "$YLW" "$RST" "$1"; }
die()  { printf '  %s✗%s %s\n\n' "$RED" "$RST" "$1" >&2; exit 1; }
step() { printf '\n%s%s%s\n' "$BLD" "$1" "$RST"; }
hint() { printf '    %s%s%s\n' "$DIM" "$1" "$RST"; }

START=1
[[ "${1:-}" == "--no-start" ]] && START=0

OLLAMA_PORT=11434

# The single source of truth for which models this app needs.
# backend/models_config.py reads the same file, so what this script pulls cannot
# drift from what the app resolves at runtime. Read as JSON rather than by
# importing models_config, which would need the backend's Python dependencies
# installed on the host.
MODELS_FILE=backend/models.json

printf '\n%sBreeze setup%s\n' "$BLD" "$RST"

# --- 1. Docker --------------------------------------------------------------
step '1/5  Docker'
command -v docker >/dev/null 2>&1 || die "docker not found. Install Docker: https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || die "the Docker daemon isn't running. Start Docker Desktop, or: sudo systemctl start docker"
docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is missing. Install Compose v2: https://docs.docker.com/compose/install/"
ok "docker $(docker version --format '{{.Server.Version}}') with compose $(docker compose version --short)"
command -v python3 >/dev/null 2>&1 || die "python3 not found (used to read $MODELS_FILE and to write .env)"

# --- 2. .env ----------------------------------------------------------------
step '2/5  Environment'

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -base64 32 | tr -d '\n=+/' | cut -c1-32
  else head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n' | cut -c1-32
  fi
}

# Replace KEY=<placeholder> in .env, portable across GNU and BSD sed.
set_env() {
  local key=$1 value=$2
  python3 - "$key" "$value" <<'PY'
import re, sys, pathlib
key, value = sys.argv[1], sys.argv[2]
p = pathlib.Path('.env')
s = p.read_text()
s, n = re.subn(rf'(?m)^{re.escape(key)}=.*$', f'{key}={value}', s, count=1)
if not n:
    s = s.rstrip('\n') + f'\n{key}={value}\n'
p.write_text(s)
PY
}

if [[ -f .env ]]; then
  ok ".env already exists -- leaving it alone"
else
  cp .env.example .env
  set_env BREEZE_API_KEY    "$(gen_secret)"
  set_env NEXTAUTH_SECRET   "$(gen_secret)"
  set_env PLATFORM_PASSWORD "$(gen_secret)"
  ok "wrote .env from .env.example with generated secrets"
fi

# A leftover placeholder means someone copied .env.example by hand.
if grep -qE '^(BREEZE_API_KEY|NEXTAUTH_SECRET|PLATFORM_PASSWORD)=change-me$' .env; then
  die ".env still has 'change-me' placeholders. Fill them in, or delete .env and re-run this script."
fi

DEMO_PASSWORD=$(grep -E '^PLATFORM_PASSWORD=' .env | cut -d= -f2-)
grep -qE '^TAVILY_API_KEY=.+' .env \
  && ok "Tavily key set -- web search uses Tavily" \
  || warn "no TAVILY_API_KEY -- web search falls back to a keyless DuckDuckGo scrape (works, lower quality)"

# --- 3. Ollama --------------------------------------------------------------
step '3/5  Ollama (runs on the host, not in a container)'
command -v ollama >/dev/null 2>&1 || die "ollama not found. Install it: https://ollama.com/download"

if ! curl -sf -m 5 "http://localhost:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
  die "Ollama isn't responding on port ${OLLAMA_PORT}. Start it with 'ollama serve' (or: sudo systemctl start ollama) and re-run."
fi
ok "Ollama is running on port ${OLLAMA_PORT}"

# The part everyone gets bitten by: Ollama defaults to binding 127.0.0.1, which
# containers cannot reach -- they arrive from the bridge, not from loopback. So
# probe from an actual container rather than trusting the localhost check above.
printf '  … checking that containers can reach it'
if docker run --rm --add-host=host.docker.internal:host-gateway alpine:3 \
     wget -q -O /dev/null -T 5 "http://host.docker.internal:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
  printf '\r\033[K'; ok "containers can reach Ollama at host.docker.internal:${OLLAMA_PORT}"
else
  printf '\r\033[K'
  warn "Ollama is bound to localhost only, so the containers can't reach it."
  hint "Ollama must listen on 0.0.0.0. On Linux with systemd:"
  hint ""
  hint "  sudo systemctl edit ollama"
  hint "  # add these three lines, save, exit:"
  hint "  [Service]"
  hint "  Environment=\"OLLAMA_HOST=0.0.0.0\""
  hint ""
  hint "  sudo systemctl daemon-reload && sudo systemctl restart ollama"
  hint ""
  hint "Running it by hand instead:  OLLAMA_HOST=0.0.0.0 ollama serve"
  hint "On macOS / Windows: Ollama Desktop → Settings → 'Expose Ollama to the network'."
  hint ""
  die "Fix the bind address and re-run ./setup.sh -- chat will not work until this passes."
fi

# --- 4. Models --------------------------------------------------------------
step '4/5  Models'
[[ -f $MODELS_FILE ]] || die "$MODELS_FILE not found -- run this from the repo root."

# One "<model>TAB<roles>" line per distinct model, deduped, in first-use order.
MODEL_ROLES=$(python3 - "$MODELS_FILE" <<'PY'
import collections, json, sys

models = json.load(open(sys.argv[1]))
by_model: dict[str, list[str]] = collections.OrderedDict()
for role, name in models.items():
    by_model.setdefault(name, []).append(role)
for name, roles in by_model.items():
    print(name, ", ".join(roles), sep="\t")
PY
) || die "$MODELS_FILE is not valid JSON"

INSTALLED=$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')
while IFS=$'\t' read -r model roles; do
  [[ -n $model ]] || continue
  if grep -qx "$model" <<<"$INSTALLED"; then
    ok "$model ${DIM}($roles)${RST}"
  else
    printf '  … pulling %s -- %s (this can take a while)\n' "$model" "$roles"
    ollama pull "$model" || die "failed to pull $model"
    ok "$model ${DIM}($roles)${RST}"
  fi
done <<<"$MODEL_ROLES"

# --- 5. Build & start -------------------------------------------------------
step '5/5  Containers'
if [[ $START -eq 0 ]]; then
  ok "--no-start given; run 'docker compose up -d --build' when ready"
  exit 0
fi

docker compose up -d --build

APP_URL=$(grep -E '^NEXTAUTH_URL=' .env | cut -d= -f2-)
printf '  … waiting for %s' "${APP_URL:-http://localhost:3000}"
for _ in $(seq 1 60); do
  if curl -sf -m 3 -o /dev/null "${APP_URL:-http://localhost:3000}/login"; then
    printf '\r\033[K'; ok "Breeze is up at ${APP_URL:-http://localhost:3000}"
    printf '\n  Demo password: %s%s%s\n' "$BLD" "$DEMO_PASSWORD" "$RST"
    hint "(it's PLATFORM_PASSWORD in .env)"
    printf '\n  %sdocker compose logs -f%s     follow logs\n' "$DIM" "$RST"
    printf '  %sdocker compose down%s        stop\n\n' "$DIM" "$RST"
    exit 0
  fi
  printf '.'; sleep 2
done

printf '\r\033[K'
die "the frontend didn't come up in 120s. Check: docker compose logs"
