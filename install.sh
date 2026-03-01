#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[install] Node.js is required but was not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[install] npm is required but was not found in PATH."
  exit 1
fi

echo "[install] Installing dependencies..."
npm install

echo "[install] Building production bundle..."
npm run build

echo "[install] Completed successfully."
