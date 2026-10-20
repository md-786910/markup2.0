#!/usr/bin/env bash
# Backup sidecar loop: every hour, if the newest backup is older than
# BACKUP_INTERVAL_DAYS, dump MongoDB and the uploads folder, encrypt both with
# AES-256 (BACKUP_PASSPHRASE) and keep the newest BACKUP_KEEP sets.
#
# Restore:
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
#     -in mongo-<stamp>.archive.gz.enc | mongorestore --uri "$MONGO_URI" --gzip --archive --drop
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
#     -in uploads-<stamp>.tar.gz.enc | tar -xz -C <restore-dir>
set -uo pipefail
umask 077

INTERVAL_DAYS="${BACKUP_INTERVAL_DAYS:-7}"
KEEP="${BACKUP_KEEP:-8}"
DIR=/backups
ENC=(openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE)

log() { echo "[backup] $(date -u +%FT%TZ) $*"; }

newest_age_days() {
  local newest
  newest=$(ls -1t "$DIR"/mongo-*.archive.gz.enc 2>/dev/null | head -1)
  [ -z "$newest" ] && { echo 999999; return; }
  echo $(( ( $(date +%s) - $(stat -c %Y "$newest") ) / 86400 ))
}

run_backup() {
  local stamp tmp
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  tmp="$DIR/.tmp-$stamp"
  mkdir -p "$tmp"

  log "starting $stamp"
  if ! mongodump --uri "$MONGO_URI" --gzip --archive | "${ENC[@]}" -out "$tmp/mongo-$stamp.archive.gz.enc"; then
    log "ERROR: mongodump failed"; rm -rf "$tmp"; return 1
  fi
  if [ -d /uploads ]; then
    if ! tar -cz -C /uploads . | "${ENC[@]}" -out "$tmp/uploads-$stamp.tar.gz.enc"; then
      log "ERROR: uploads archive failed"; rm -rf "$tmp"; return 1
    fi
  fi
  # Publish atomically so a half-written backup is never mistaken for a good one
  mv "$tmp"/* "$DIR"/ && rmdir "$tmp"

  # Retention: keep the newest $KEEP sets
  ls -1t "$DIR"/mongo-*.archive.gz.enc 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
  ls -1t "$DIR"/uploads-*.tar.gz.enc 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
  log "done $stamp ($(du -sh "$DIR" | cut -f1) total)"
}

mkdir -p "$DIR"
rm -rf "$DIR"/.tmp-*
log "sidecar started: every ${INTERVAL_DAYS}d, keep ${KEEP}"
while true; do
  if [ "$(newest_age_days)" -ge "$INTERVAL_DAYS" ]; then
    run_backup || log "backup failed; retrying next hour"
  fi
  sleep 3600
done
