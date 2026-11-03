# Runbook: Restore a backup

The `backup` service writes an **encrypted** backup of the database and of the
uploads to `deploy/backups/` every 7 days and keeps the newest 8:
`mongo-<stamp>.archive.gz.enc` and `uploads-<stamp>.tar.gz.enc`. They can only
be opened with `BACKUP_PASSPHRASE`, which is kept outside the server. Source:
[`DEPLOY.md`](../../DEPLOY.md) section 12.

## 1. Pick the backup

```bash
cd /root/markup2.0
ls -lh deploy/backups/
```

If the server itself is lost, copy the files back from the off-server copy
first.

## 2. Stop writes

Take the API down so nobody changes data during the restore:

```bash
docker compose stop server
```

## 3. Restore the database

`--drop` replaces each collection with the backup's copy.

```bash
export BACKUP_PASSPHRASE='<from your safe place>'
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in deploy/backups/mongo-<stamp>.archive.gz.enc \
  | docker compose exec -T mongo mongorestore \
      --uri "mongodb://root:<MONGO_ROOT_PASSWORD>@localhost:27017/?authSource=admin" \
      --gzip --archive --drop
```

## 4. Restore the uploads

Screenshots, documents, avatars and support attachments:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in deploy/backups/uploads-<stamp>.tar.gz.enc \
  | docker compose run --rm -T --no-deps --user root --entrypoint tar server -xz -C /app/uploads
```

## 5. Start and check

```bash
docker compose up -d          # also fixes upload file ownership
curl -fsS https://api.kommently.info/api/health
docker compose exec mongo mongosh --quiet \
  "mongodb://root:<MONGO_ROOT_PASSWORD>@localhost:27017/?authSource=admin" \
  --eval 'db.getSiblingDB("kommently").organizations.countDocuments()'
```

Use the database name from `MONGODB_URI` in `.env` if it is not `kommently`.
Then sign in to the admin panel and check that recent organizations are there.

## Redis

Redis holds rate limits, the email queue and the daily billing job. Nothing in
it needs restoring: after a loss it is rebuilt as traffic comes in. Check it with:

```bash
docker compose ps redis       # "healthy"
```

Emails that were waiting in the queue at the moment of the loss are not sent.
