#!/usr/bin/env bash
# Pull the Ollama models Breeze needs.
#
# Reads backend/models.json -- the same file setup.sh and models_config.py read --
# so this cannot drift from what the app resolves at runtime.
#
# ./setup.sh already does this (and checks everything else). This file is here
# for when you only want the weights.
set -euo pipefail
cd "$(dirname "$0")"

MODELS_FILE=backend/models.json
[[ -f $MODELS_FILE ]] || { echo "$MODELS_FILE not found -- run this from the repo root." >&2; exit 1; }

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
) || { echo "$MODELS_FILE is not valid JSON" >&2; exit 1; }

while IFS=$'\t' read -r model roles; do
  [[ -n $model ]] || continue
  printf '\n== %s  (%s)\n' "$model" "$roles"
  ollama pull "$model"
done <<<"$MODEL_ROLES"
