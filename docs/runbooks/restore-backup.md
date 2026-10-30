# Runbook: Restore Database Backup

## 1. Overview
Procedure to restore MongoDB, the uploads folder and Redis state in the event of hardware failure, catastrophic data corruption, or disaster recovery.

The authoritative reference is `DEPLOY.md` section 12. Run every command as root from the repo root (`/root/markup2.0`).

---

## 2. What the backups are

- The `backup` service (`deploy/backup/backup-loop.sh`) writes a set every `BACKUP_INTERVAL_DAYS` (default 7) and keeps the newest `BACKUP_KEEP` (default 8) sets in `deploy/backups/` on the host.
- Each set is two AES-256 encrypted files (`openssl enc -aes-256-cbc -pbkdf2 -iter 200000`, key `BACKUP_PASSPHRASE` from `.env`):
  - `mongo-<stamp>.archive.gz.enc`: a `mongodump --gzip --archive` of the whole MongoDB instance.
  - `uploads-<stamp>.tar.gz.enc`: a tar.gz of the uploads volume (`/app/uploads` in the API container).
- `<stamp>` is UTC, e.g. `20261030T040000Z`. Restore the `mongo-` and `uploads-` files with the **same** stamp.
- Without `BACKUP_PASSPHRASE` the files cannot be decrypted. If the server was lost, copy the backups back from your off-server copy into `deploy/backups/` first.

---

## 3. MongoDB Restore Procedure

### Tools
- `openssl` on the host (decryption).
- `mongorestore` inside the `mongo` container (no host install needed).
- Credentials: the Mongo root user. The `mongo` container already has its password in `MONGO_INITDB_ROOT_PASSWORD`, so it never has to be typed or printed.

### Steps

1. **Verify Backup Archive:**
   Check the timestamp and size of the latest backup set:
   ```bash
   ls -lht deploy/backups/
   ```

2. **Stop Ingestion Traffic (Optional but Recommended):**
   There is no maintenance mode in the admin panel. Stop the API so nobody writes while the restore runs (Mongo keeps running):
   ```bash
   docker compose stop server
   ```

3. **Execute Restore:**
   ```bash
   export BACKUP_PASSPHRASE='<from your safe place>'
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
     -in deploy/backups/mongo-<stamp>.archive.gz.enc \
     | docker compose exec -T mongo sh -c \
       'mongorestore --uri "mongodb://root:$MONGO_INITDB_ROOT_PASSWORD@localhost:27017/?authSource=admin" --gzip --archive --drop'
   ```
   > **Note:** The `--drop` flag will clean existing collections before restoring.
   > This is the same command as `DEPLOY.md` section 12, which writes the root password into the URI instead.

4. **Verify Collection Counts:**
   The app database is `markup_mvp`:
   ```bash
   docker compose exec mongo sh -c \
     'mongosh --quiet -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin markup_mvp \
       --eval "db.organizations.countDocuments()"'
   ```

---

## 4. Uploads Restore Procedure

Uploaded files (documents, comment attachments, screenshots, support attachments) are in the `uploads` volume, backed up as `uploads-<stamp>.tar.gz.enc` (documented in `DEPLOY.md` section 12).

1. **Extract into the uploads volume:**
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
     -in deploy/backups/uploads-<stamp>.tar.gz.enc \
     | docker compose run --rm -T --no-deps --user root --entrypoint tar server -xz -C /app/uploads
   ```
   This extracts over the existing files; it does not delete files that are not in the backup.

2. **Start the stack again:**
   ```bash
   docker compose up -d     # uploads-perms fixes ownership before the API starts
   ```

3. **Verify:** `curl -s http://127.0.0.1:<API_PORT>/api/health` (or `https://api.kommently.info/api/health`) returns `"db":"up"`, then open a document project in the app and check its files load.

---

## 5. Redis Cache Rehydration

Redis holds the shared rate limits, the BullMQ email batch queue (`email-batches`), the daily billing job schedule and the socket.io adapter. It is not backed up.
If Redis suffers data loss, rate limits rebuild as traffic flows and the billing schedule is re-registered when the API starts (`docker compose up -d`); notification emails that were waiting in the queue are lost.

1. **Restart Redis Service:**
   ```bash
   docker compose restart redis
   ```
2. **Ping Redis Status:**
   Redis requires a password (`--requirepass`); the container has it in `REDIS_PASSWORD`:
   ```bash
   docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping'
   # Expected output: PONG
   ```
