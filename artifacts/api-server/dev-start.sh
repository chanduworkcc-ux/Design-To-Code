#!/bin/bash
# ─── Resilient Dev Startup ────────────────────────────────────────────────────
# Keeps the API server alive permanently by:
#   1. Installing deps if node_modules are missing (survives Replit sleep/wakeup)
#   2. Running db-restore + db-watch (background auto-backup)
#   3. Building the server (fatal error if both attempts fail)
#   4. Auto-restarting on crash with exponential backoff that resets on healthy runs
# ─────────────────────────────────────────────────────────────────────────────

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_DIR="$WORKSPACE_ROOT/artifacts/api-server"
SERVER_PID=""
DB_WATCH_PID=""

log() { echo "[$(date -u +%H:%M:%SZ)] $1"; }

# Single cleanup handler — removes itself first to prevent recursive invocations
cleanup() {
  trap - EXIT SIGTERM SIGINT
  [ -n "$SERVER_PID"   ] && kill "$SERVER_PID"   2>/dev/null
  [ -n "$DB_WATCH_PID" ] && kill "$DB_WATCH_PID" 2>/dev/null
}
trap cleanup EXIT SIGTERM SIGINT

# ── 1. Ensure dependencies are installed ──────────────────────────────────────
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

# ── 4. Defaults ───────────────────────────────────────────────────────────────
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-8080}"

# ── 5. Build (fatal after two attempts) ───────────────────────────────────────
log "Building API server..."
cd "$API_DIR"
if ! pnpm run build; then
  log "Build failed — retrying after pnpm install..."
  cd "$WORKSPACE_ROOT" && pnpm install && cd "$API_DIR"
  if ! pnpm run build; then
    log "Build failed after retry — aborting."
    exit 1
  fi
fi

# ── 6. Start with auto-restart loop ──────────────────────────────────────────
# Backoff resets to 2s whenever the server runs for at least HEALTHY_UPTIME seconds,
# ensuring transient restarts (e.g. after sleep/wakeup) stay snappy.
RESTART_DELAY=2
MAX_DELAY=10
HEALTHY_UPTIME=30   # seconds

log "Starting server on port $PORT (auto-restart enabled)"
while true; do
  START_TIME=$(date +%s)

  node --enable-source-maps ./dist/index.mjs &
  SERVER_PID=$!
  wait "$SERVER_PID"
  EXIT_CODE=$?
  SERVER_PID=""

  UPTIME=$(( $(date +%s) - START_TIME ))
  if [ "$UPTIME" -ge "$HEALTHY_UPTIME" ]; then
    # Session was healthy — treat next restart as fresh, not a crash loop
    RESTART_DELAY=2
  fi

  log "Server exited (code $EXIT_CODE, uptime ${UPTIME}s). Restarting in ${RESTART_DELAY}s..."
  sleep "$RESTART_DELAY"

  # Exponential backoff up to MAX_DELAY
  RESTART_DELAY=$(( RESTART_DELAY * 2 ))
  [ "$RESTART_DELAY" -gt "$MAX_DELAY" ] && RESTART_DELAY=$MAX_DELAY
done
