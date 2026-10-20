#!/usr/bin/env bash
# Nightly backup of MongoDB + uploaded files, with retention.
# Schedule from crontab, e.g.:
#   30 1 * * *  cd /app/server && ./scripts/backup.sh >> logs/backup.log 2>&1
# Copy BACKUP_DIR off the machine (S3/R2/Drive) — a backup on the same disk
# doesn't survive losing that disk. Test a restore with:
#   mongorestore --uri "$MONGODB_URI" --gzip --archive=<file>.archive.gz --drop
set -euo pipefail

cd "$(dirname "$0")/.."
# Read only the keys we need from .env (env vars already set take precedence)
envval() { [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//'; }
MONGODB_URI="${MONGODB_URI:-$(envval MONGODB_URI || true)}"
BACKUP_DIR="${BACKUP_DIR:-$(envval BACKUP_DIR || true)}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-$(envval BACKUP_RETENTION_DAYS || true)}"

: "${MONGODB_URI:?MONGODB_URI is not set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
umask 077

mongodump --uri "$MONGODB_URI" --gzip --archive="$BACKUP_DIR/mongo-$STAMP.archive.gz"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" uploads

find "$BACKUP_DIR" -type f \( -name 'mongo-*.archive.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$RETENTION_DAYS" -delete
echo "[backup] done $STAMP -> $BACKUP_DIR"
