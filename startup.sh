#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[startup] Node.js is required but was not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[startup] npm is required but was not found in PATH."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[startup] node_modules not found. Running install first..."
  ./install.sh
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "[startup] Production build not found. Building now..."
  npm run build
fi

export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

echo "[startup] Starting Agent Monitor on http://localhost:${PORT}"
exec npm start
