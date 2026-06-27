#!/bin/bash
# ─── Database Restore Script ──────────────────────────────────────────────────
# Runs on every container start. If the PostgreSQL container was recycled and
# data wiped, this restores from the last backup saved in the persistent
# workspace directory (/home/runner/workspace/.db-backup/).
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="/home/runner/workspace/.db-backup"
BACKUP_FILE="$BACKUP_DIR/latest.dump"
LOG_FILE="$BACKUP_DIR/backup.log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" | tee -a "$LOG_FILE"
}

if [ ! -f "$BACKUP_FILE" ]; then
  log "INFO: No backup file found at $BACKUP_FILE — skipping restore."
  exit 0
fi

TABLE_COUNT=$(psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')

if [ -z "$TABLE_COUNT" ]; then
  log "WARN: Could not query database — skipping restore."
  exit 0
fi

if [ "$TABLE_COUNT" -lt "5" ]; then
  log "INFO: Database appears empty ($TABLE_COUNT tables). Restoring from backup..."
  pg_restore \
    --dbname="$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    "$BACKUP_FILE" 2>&1 | tail -10 | tee -a "$LOG_FILE"
  RESTORED_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')
  log "SUCCESS: Restore complete. Tables after restore: $RESTORED_COUNT"
else
  log "INFO: Database healthy ($TABLE_COUNT tables). No restore needed."
fi
