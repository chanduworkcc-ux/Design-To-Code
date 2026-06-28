#!/bin/bash
# ─── Database Watch / Auto-Backup Script ─────────────────────────────────────
# Runs in the background alongside the API server.
# Takes a full pg_dump into the persistent workspace every 60 seconds.
# The workspace filesystem (/home/runner/workspace) survives container recycles,
# so this ensures data is never lost for more than 60 seconds.
#
# SAFETY RULE: Never overwrite a larger backup with a smaller one.
# This prevents an empty-DB backup (taken right after a fresh start) from
# destroying a good backup that contained real user data.
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="/home/runner/workspace/.db-backup"
BACKUP_FILE="$BACKUP_DIR/latest.dump"
LOG_FILE="$BACKUP_DIR/backup.log"
INTERVAL_SECONDS=60

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE"
  tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
}

do_backup() {
  local TMP="$BACKUP_FILE.tmp"
  pg_dump --dbname="$DATABASE_URL" -Fc -f "$TMP" 2>/dev/null
  if [ $? -ne 0 ]; then
    rm -f "$TMP"
    log "AUTO-BACKUP FAILED — will retry in ${INTERVAL_SECONDS}s"
    return
  fi

  local NEW_SIZE
  NEW_SIZE=$(stat -c%s "$TMP" 2>/dev/null || echo 0)

  local OLD_SIZE=0
  if [ -f "$BACKUP_FILE" ]; then
    OLD_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
  fi

  # Only overwrite if the new backup is at least as large as the existing one.
  # This prevents an empty-state backup from destroying a good backup.
  if [ "$NEW_SIZE" -ge "$OLD_SIZE" ]; then
    mv "$TMP" "$BACKUP_FILE"
    local HUMAN
    HUMAN=$(du -sh "$BACKUP_FILE" | cut -f1)
    log "AUTO-BACKUP OK — size: $HUMAN (${NEW_SIZE}B >= ${OLD_SIZE}B)"
  else
    rm -f "$TMP"
    log "AUTO-BACKUP SKIPPED — new dump (${NEW_SIZE}B) is smaller than existing (${OLD_SIZE}B); keeping existing backup to protect user data"
  fi
}

log "Watcher started (interval: ${INTERVAL_SECONDS}s)"

# Wait 30 seconds before the first backup to allow the API server to fully
# initialize and seed its data. This prevents taking a backup of a partially
# initialized database state on fresh starts.
sleep 30
do_backup

while true; do
  sleep $INTERVAL_SECONDS
  do_backup
done
