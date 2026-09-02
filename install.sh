#!/usr/bin/env bash
# Pull the Ollama models Breeze needs. Kept in lockstep with
# backend/models_config.py.
#
# ./setup.sh already does this (and checks everything else). This file is here
# for when you only want the weights.
set -euo pipefail

ollama pull phi4-mini:3.8b   # default + summarize
ollama pull gemma3:12b       # vision + generative UI
ollama pull qwen3:8b         # thinking
ollama pull qwen2.5:7b       # web search
