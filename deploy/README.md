# Data services (Docker Compose)

MongoDB, Redis and a weekly encrypted backup sidecar. Nothing listens on a public
interface: ports are bound to `127.0.0.1`, auth is required, and the API uses a
least-privilege Mongo user.

## Start

```bash
cd deploy
cp .env.example .env        # fill in: openssl rand -hex 24 for each secret
docker compose up -d
docker compose ps           # mongo + redis should be "healthy"
```

The Mongo app user is created on the **first** start (empty volume) from
`mongo-init/01-app-user.js`. Changing `MONGO_APP_PASSWORD` later needs
`db.changeUserPassword()` — the init script doesn't run again.

## Connect the API

API on the same host (PM2/systemd), in `server/.env`:

```
MONGODB_URI=mongodb://<MONGO_APP_USER>:<MONGO_APP_PASSWORD>@127.0.0.1:27017/markup_mvp?authSource=markup_mvp
REDIS_URL=redis://:<REDIS_PASSWORD>@127.0.0.1:6379   # email queue, rate limits, socket.io, billing job
```

If the API runs in this compose project, attach it to the `backend` network and
use the service names instead (`mongo:27017`, `redis:6379`): traffic stays on the
private Docker network.

## Access the database from your machine (SSH tunnel)

```bash
ssh -N -L 27017:127.0.0.1:27017 -L 6379:127.0.0.1:6379 deploy@<server>
# then connect Compass / mongosh to mongodb://<user>:<pass>@127.0.0.1:27017/?authSource=admin
```

Never publish 27017/6379 on `0.0.0.0` or open them in the firewall.

## Backups

The `backup` service checks hourly and runs when the newest backup is older than
`BACKUP_INTERVAL_DAYS` (default 7), so restarts never skip or duplicate a week.
Each run writes two AES-256 encrypted files (`mongo-*.archive.gz.enc`,
`uploads-*.tar.gz.enc`) to `BACKUP_DIR` and keeps the newest `BACKUP_KEEP` sets.

- Keep `BACKUP_PASSPHRASE` in your password manager. Without it, backups can't be restored.
- Copy `BACKUP_DIR` off the server (S3/R2/another host); a backup on the same disk
  doesn't survive losing that disk. Set `BACKUP_UID`/`BACKUP_GID` to the user that
  runs the sync so it can read the files.
- Force a backup now: `docker compose run --rm -e BACKUP_INTERVAL_DAYS=0 backup` (Ctrl+C after "done").

Restore (test this regularly):

```bash
export BACKUP_PASSPHRASE=...
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in backups/mongo-<stamp>.archive.gz.enc \
  | docker compose exec -T mongo mongorestore --uri "mongodb://root:<pass>@localhost:27017/?authSource=admin" --gzip --archive --drop

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in backups/uploads-<stamp>.tar.gz.enc | tar -xz -C ../server/uploads
```
