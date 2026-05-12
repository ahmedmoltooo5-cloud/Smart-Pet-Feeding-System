#!/bin/zsh

set -e

PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$PROJECT_DIR"

stop_node_listener() {
  local PORT="$1"
  local PIDS

  PIDS="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | awk 'NR > 1 && $1 == "node" { print $2 }' | sort -u)"

  if [ -z "$PIDS" ]; then
    return 0
  fi

  echo "Stopping existing Node process on port $PORT..."

  for PID in $PIDS; do
    kill "$PID" 2>/dev/null || true
  done

  sleep 1

  for PID in $PIDS; do
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null || true
    fi
  done
}

check_non_node_listener() {
  local PORT="$1"

  if lsof -nP -iTCP:$PORT -sTCP:LISTEN 2>/dev/null | awk 'NR > 1 && $1 != "node" { print $1; exit }' | grep -q .; then
    echo "Port $PORT is being used by a non-Node process."
    echo "Please stop that process manually, then run this script again."
    exit 1
  fi
}

echo "Starting Smart Pet Feeder..."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies first..."
  npm install
fi

if [ ! -f ".env" ]; then
  echo "No .env file found. Creating one from .env.example..."
  cp .env.example .env
  echo "Update .env with your real settings, then run this script again."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop is not running. Start Docker Desktop, then run this script again."
  exit 1
fi

for PORT in 4000 5173; do
  check_non_node_listener "$PORT"
  stop_node_listener "$PORT"
done

echo "Starting SQL Server in Docker..."
docker compose up -d sqlserver

echo "Starting frontend and backend together..."
npm run dev
