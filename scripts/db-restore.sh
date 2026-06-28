#!/bin/bash
# ─── Database Restore Script ──────────────────────────────────────────────────
# Runs on every container start. If the PostgreSQL data was wiped, this restores
# from the last backup saved in the persistent workspace directory.
#
# Restore triggers when EITHER:
#   1. The database has fewer than 5 tables (schema was wiped), OR
#   2. The users table exists but has 0 rows (data was wiped but schema survived)
#
# This covers both the "full wipe" and the "schema-only wipe" scenarios.
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="/home/runner/workspace/.db-backup"
BACKUP_FILE="$BACKUP_DIR/latest.dump"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" | tee -a "$LOG_FILE"
}

if [ ! -f "$BACKUP_FILE" ]; then
  log "INFO: No backup file found at $BACKUP_FILE — skipping restore (fresh start)."
  exit 0
fi

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$BACKUP_SIZE" -lt "10000" ]; then
  log "WARN: Backup file is suspiciously small (${BACKUP_SIZE}B) — skipping restore to avoid wiping data with a bad backup."
  exit 0
fi

TABLE_COUNT=$(psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')

if [ -z "$TABLE_COUNT" ]; then
  log "WARN: Could not query database — skipping restore."
  exit 0
fi

NEEDS_RESTORE=0
REASON=""

if [ "$TABLE_COUNT" -lt "5" ]; then
  NEEDS_RESTORE=1
  REASON="schema wiped ($TABLE_COUNT tables found)"
else
  USER_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')

  if [ -z "$USER_COUNT" ]; then
    log "WARN: Could not query users table — skipping restore."
    exit 0
  fi

  if [ "$USER_COUNT" -lt "1" ]; then
    NEEDS_RESTORE=1
    REASON="data wiped (users table is empty, $TABLE_COUNT tables present)"
  fi
fi

if [ "$NEEDS_RESTORE" -eq "1" ]; then
  log "INFO: Restore needed — $REASON. Backup size: ${BACKUP_SIZE}B. Restoring..."
  pg_restore \
    --dbname="$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    "$BACKUP_FILE" 2>&1 | tail -20 | tee -a "$LOG_FILE"
  RESTORED_TABLES=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')
  RESTORED_USERS=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
  log "SUCCESS: Restore complete. Tables: $RESTORED_TABLES, Users: $RESTORED_USERS"
else
  log "INFO: Database healthy ($TABLE_COUNT tables, $USER_COUNT users). No restore needed."
fi
