# Deploy

Everything runs on one host with Docker Compose (`docker-compose.yml` in the
repo root). Each app is its own container; only Caddy (HTTPS on 80/443) is
public. All settings live in one file: `.env` in the repo root.

| Service | What |
|---|---|
| `caddy` | HTTPS certificates, routes each domain to its app |
| `server` | API, live updates, website proxy, daily billing job |
| `client`, `admin`, `website` | React builds served by nginx |
| `mongo`, `redis` | Databases on a private network |
| `backup` | Weekly encrypted backup of the database and uploads |

Files in this folder: `Caddyfile` (routing), `docker/` (image recipes),
`mongo-init/` (creates the app's database user), `backup/` (backup loop),
`backups/` (output, gitignored).

## First deploy (e.g. kommently.info)

```bash
cp .env.example .env            # fill in URLs and secrets
docker compose up -d --build
docker compose ps               # wait until everything is "healthy"
```

Point DNS for `kommently.info`, `app.`, `admin.` and `api.kommently.info` at
the server. Certificates arrive on the first request.

## Release and rollback

```bash
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build
IMAGE_TAG=<previous sha> docker compose up -d     # rollback, no rebuild
```

Frontend URLs are compiled into the images, so after changing a URL in
`.env` run `docker compose up -d --build client admin website`.

## Local machine

Same stack, local domains. In `.env` use the commented local URLs
(`http://*.kommently.localhost`); `*.localhost` always points to this
computer, so no hosts-file changes or certificates are needed.

```bash
docker compose up -d --build
```

Then open http://app.kommently.localhost, http://admin.kommently.localhost,
http://kommently.localhost (API: http://api.kommently.localhost).

For hot reload while coding, run only the databases in Docker
(`docker compose up -d mongo redis`) and the apps with `npm run dev` /
`npm start`.

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
