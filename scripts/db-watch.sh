#!/bin/bash
# ─── Database Watch / Auto-Backup Script ─────────────────────────────────────
# Runs in the background alongside the API server.
# Takes a full pg_dump into the persistent workspace every 5 minutes.
# The workspace filesystem (/home/runner/workspace) survives container recycles,
# so this ensures data is never lost for more than 5 minutes.
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="/home/runner/workspace/.db-backup"
BACKUP_FILE="$BACKUP_DIR/latest.dump"
LOG_FILE="$BACKUP_DIR/backup.log"
INTERVAL_SECONDS=300

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOG_FILE"
  tail -200 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
}

do_backup() {
  pg_dump --dbname="$DATABASE_URL" -Fc -f "$BACKUP_FILE.tmp" 2>/dev/null
  if [ $? -eq 0 ]; then
    mv "$BACKUP_FILE.tmp" "$BACKUP_FILE"
    SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    log "AUTO-BACKUP OK — size: $SIZE"
  else
    rm -f "$BACKUP_FILE.tmp"
    log "AUTO-BACKUP FAILED — will retry in ${INTERVAL_SECONDS}s"
  fi
}

log "Watcher started (interval: ${INTERVAL_SECONDS}s)"

do_backup

while true; do
  sleep $INTERVAL_SECONDS
  do_backup
done
