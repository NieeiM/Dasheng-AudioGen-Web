#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
HOST="${HOST:-0.0.0.0}"
PORT="${1:-${PORT:-8001}}"

if [[ "${PORT}" == "-h" || "${PORT}" == "--help" ]]; then
  cat <<'EOF'
Usage: ./serve.sh [port]

Serve the Dasheng AudioGen project page over HTTP.

Environment variables:
  HOST        Bind address (default: 0.0.0.0)
  PORT        Listen port (default: 8000; overridden by [port])
  PYTHON_BIN  Python executable (default: python3)

Examples:
  ./serve.sh
  ./serve.sh 8080
  HOST=127.0.0.1 PORT=3000 ./serve.sh
EOF
  exit 0
fi

if (( $# > 1 )); then
  echo "Error: expected at most one argument: [port]" >&2
  exit 2
fi

if [[ ! "${PORT}" =~ ^[0-9]+$ ]]; then
  echo "Error: port must be an integer between 1 and 65535 (got: ${PORT})." >&2
  exit 2
fi

PORT_NUMBER=$((10#${PORT}))
if (( PORT_NUMBER < 1 || PORT_NUMBER > 65535 )); then
  echo "Error: port must be an integer between 1 and 65535 (got: ${PORT})." >&2
  exit 2
fi
PORT="${PORT_NUMBER}"

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "Error: Python executable not found: ${PYTHON_BIN}" >&2
  echo "Install Python 3 or set PYTHON_BIN to a valid executable." >&2
  exit 127
fi

if [[ ! -f "${PROJECT_DIR}/index.html" ]]; then
  echo "Error: index.html not found in project directory: ${PROJECT_DIR}" >&2
  exit 1
fi

echo "Serving Dasheng AudioGen from ${PROJECT_DIR}"
echo "Listening on http://${HOST}:${PORT} (press Ctrl+C to stop)"

exec "${PYTHON_BIN}" -m http.server "${PORT}" \
  --bind "${HOST}" \
  --directory "${PROJECT_DIR}"
