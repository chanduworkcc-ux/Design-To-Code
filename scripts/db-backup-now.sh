#!/bin/bash
# ─── Manual On-Demand Backup ─────────────────────────────────────────────────
# Run this any time you want to snapshot the database immediately:
#   bash scripts/db-backup-now.sh
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_DIR="/home/runner/workspace/.db-backup"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/latest.dump"
DATED_FILE="$BACKUP_DIR/snapshot-$TIMESTAMP.dump"

echo "Backing up to $BACKUP_FILE ..."
pg_dump --dbname="$DATABASE_URL" -Fc -f "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
  cp "$BACKUP_FILE" "$DATED_FILE"
  echo "Backup complete: $(du -sh "$BACKUP_FILE" | cut -f1)"
  echo "Dated snapshot : $DATED_FILE"

  TABLE_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' \n')
  USER_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
  ORDER_COUNT=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM orders;" 2>/dev/null | tr -d ' \n')

  echo ""
  echo "Snapshot summary:"
  echo "  Tables : $TABLE_COUNT"
  echo "  Users  : $USER_COUNT"
  echo "  Orders : $ORDER_COUNT"
  echo ""
  ls -lh "$BACKUP_DIR/"*.dump 2>/dev/null | awk '{print "  "$NF, $5}'
else
  echo "ERROR: Backup failed."
  exit 1
fi
