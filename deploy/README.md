# Deploy

Everything runs with Docker Compose from the repo root. All settings live in
one file: `.env` in the repo root.

- `docker-compose.yml`: all services in **development** mode (source mounted,
  API and frontends reload on save).
- `docker-compose.override.yml`: loaded automatically; turns the same services
  into **production**: the API runs its built image; the frontends are built
  once, copied to `client/build`, `admin/build` and `website/build` and the job exits.
  The host's nginx serves those folders.
  On a local machine, comment out services there to keep them in dev mode.

| Service | What | Dev (local port) | Production |
|---|---|---|---|
| `server` | API, live updates, website proxy, daily billing job | 5000 | 5000 |
| `client` | App | 8081 | `client/build` |
| `admin` | Admin panel | 8082 | `admin/build` |
| `website` | Marketing site | 8083 | `website/build` |
| `mongo`, `redis` | Databases on a private network | 27017, 6379 |
| `backup` | Weekly encrypted backup of the database and uploads | — |

Files in this folder: `nginx/kommently.conf` (site file for an existing
nginx), `docker/` (image recipes),
`mongo-init/` (creates the app's database user), `backup/` (backup loop),
`backups/` (output, gitignored).

## First deploy (e.g. kommently.info)

1. DNS: point `kommently.info`, `www`, `app`, `admin` and `api` (A records)
   at the server's IP.
2. Settings and containers:

   ```bash
   cp .env.example .env            # fill in URLs and secrets
   docker compose up -d --build
   docker compose ps -a            # server "healthy"; client/admin/website "Exited (0)"
   ls client/build admin/build website/build
   ```

   The frontend jobs finishing with exit code 0 is expected: their only work
   is publishing the files. Each update copies new files first and
   `index.html` last, so people with the app open never load half an update.

3. nginx: install `deploy/nginx/kommently.conf` and run certbot; the
   commands are at the top of that file. The file assumes the repo is at
   `/root/markup2.0`; nginx needs to pass through the folders above
   the build folders once: `sudo chmod o+x /root /root/markup2.0`
   (enter only, nothing becomes listable). Certificates renew automatically.

4. Create the admin account:

   ```bash
   docker compose exec server node scripts/createSuperAdmin.js you@example.com '<strong password>'
   ```

## Release and rollback

```bash
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build
IMAGE_TAG=<previous sha> docker compose up -d     # rollback, no rebuild
```

Frontend URLs are compiled into the images, so after changing a URL in
`.env` run `docker compose up -d --build client admin website`.

## Local machine

Comment out the services in `docker-compose.override.yml` that you want in
development mode (all four for full hot reload), then:

```bash
docker compose up -d
```

API http://localhost:5000, app :8081, admin :8082, website :8083. Saving a
file restarts the API (nodemon) or reloads the frontend. The first start
installs dependencies inside the containers (a few minutes); later starts
reuse them until `package-lock.json` changes.

## Database access

```bash
ssh -N -L 27017:127.0.0.1:27017 deploy@<server>
# connect to mongodb://root:<MONGO_ROOT_PASSWORD>@127.0.0.1:27017/?authSource=admin
```

Never open 27017 or 6379 in the firewall.

## Backups

Written weekly to `deploy/backups/`, newest 8 kept. Copy that folder off the
server. Restore:

```bash
export BACKUP_PASSPHRASE=...
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in deploy/backups/mongo-<stamp>.archive.gz.enc \
  | docker compose exec -T mongo mongorestore --uri "mongodb://root:<pass>@localhost:27017/?authSource=admin" --gzip --archive --drop
```

## Existing uploads

To copy an existing `server/uploads` folder into the uploads volume once:

```bash
docker compose run --rm --no-deps -v "$PWD/server/uploads:/from:ro" --entrypoint sh server -c "cp -a /from/. /app/uploads/"
```
