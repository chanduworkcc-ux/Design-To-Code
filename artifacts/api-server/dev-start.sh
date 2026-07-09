#!/bin/bash
# ─── Resilient Dev Startup ────────────────────────────────────────────────────
# Keeps the API server alive permanently by:
#   1. Installing deps if node_modules are missing (survives Replit sleep/wakeup)
#   2. Running db-restore + db-watch (background auto-backup)
#   3. Building the server
#   4. Auto-restarting on crash with exponential backoff (max 10s)
# ─────────────────────────────────────────────────────────────────────────────

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="$WORKSPACE_ROOT/artifacts/api-server"

log() { echo "[$(date -u +%H:%M:%SZ)] $1"; }

# ── 1. Ensure dependencies are installed ─────────────────────────────────────
if [ ! -d "$WORKSPACE_ROOT/node_modules" ] || [ ! -f "$WORKSPACE_ROOT/node_modules/.modules.yaml" ]; then
  log "node_modules missing — running pnpm install..."
  cd "$WORKSPACE_ROOT" && pnpm install
  cd "$API_DIR"
fi

# ── 2. Database restore (idempotent, safe) ────────────────────────────────────
bash "$WORKSPACE_ROOT/scripts/db-restore.sh"

# ── 3. Database watch / auto-backup (background) ─────────────────────────────
bash "$WORKSPACE_ROOT/scripts/db-watch.sh" &
DB_WATCH_PID=$!
cleanup() { kill "$DB_WATCH_PID" 2>/dev/null; exit; }
trap cleanup SIGTERM SIGINT EXIT

# ── 4. Defaults ───────────────────────────────────────────────────────────────
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-8080}"

# ── 5. Build ──────────────────────────────────────────────────────────────────
log "Building API server..."
cd "$API_DIR"
if ! pnpm run build; then
  log "Build failed — retrying after pnpm install..."
  cd "$WORKSPACE_ROOT" && pnpm install && cd "$API_DIR"
  pnpm run build
fi

# ── 6. Start with auto-restart loop ──────────────────────────────────────────
RESTART_DELAY=2
MAX_DELAY=10

log "Starting server on port $PORT (auto-restart enabled)"
while true; do
  node --enable-source-maps ./dist/index.mjs
  EXIT_CODE=$?
  log "Server exited (code $EXIT_CODE). Restarting in ${RESTART_DELAY}s..."
  sleep "$RESTART_DELAY"
  # Exponential backoff up to MAX_DELAY
  RESTART_DELAY=$(( RESTART_DELAY * 2 ))
  [ "$RESTART_DELAY" -gt "$MAX_DELAY" ] && RESTART_DELAY=$MAX_DELAY
done
