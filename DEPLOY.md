# Deploying Kommently

From an empty Linux server to a running production site, plus updates,
backups and troubleshooting. Example values: domain `kommently.info`, repo at
`/root/markup2.0`. Run the commands as root, from the repo root, unless a step
says otherwise.

## How it fits together

```
Internet ──► nginx on the host (ports 80/443, HTTPS by certbot)
              ├─ api.kommently.info        ──► API container   127.0.0.1:API_PORT
              ├─ app.kommently.info        ──► files in  client/build
              ├─ admin.kommently.info      ──► files in  admin/build
              └─ kommently.info, www       ──► files in  website/build

Docker Compose (private network, nothing public)
  server         API, live updates, website proxy, daily billing job
  mongo, redis   database and queue/cache (127.0.0.1 only)
  backup         weekly encrypted backup of the database and uploads
  uploads-perms  one-shot: makes the uploads volume writable for the API
  client, admin, website   one-shot: build the frontend, copy it to <app>/build, exit
```

- One settings file: `.env` in the repo root.
- `docker-compose.yml` describes the services in development mode;
  `docker-compose.override.yml` (loaded automatically) switches them to
  production. Don't edit or comment out the override on the server.
- The frontends have the public URLs compiled in at build time, so changing a
  URL in `.env` means rebuilding (`--build`).

## 1. Before you start

- A Linux server (Ubuntu 22.04+ or Debian 12), 2+ CPU cores, 4 GB RAM, 40 GB
  disk. Root or sudo access.
- DNS: A records for `kommently.info`, `www`, `app`, `admin` and `api`, all
  pointing at the server's public IP. Exactly one A record per name, no
  stale AAAA records. With Cloudflare, use "DNS only" (grey cloud) at least
  until the certificate is issued.
- An SMTP account for sending email (verification codes, password resets,
  notifications).

Check DNS from the server; every line must show the server's IP:

```bash
curl -4 -s ifconfig.me; echo "  <- this server"
for d in kommently.info www.kommently.info app.kommently.info admin.kommently.info api.kommently.info; do
  echo "$d -> $(dig +short A $d @1.1.1.1 | tr '\n' ' ')"
done
```

## 2. Install the server software (once)

```bash
# Docker Engine + Compose plugin (Compose 2.24 or newer is required)
curl -fsSL https://get.docker.com | sh
docker compose version

# nginx and certbot
apt update && apt install -y nginx certbot python3-certbot-nginx git dnsutils

# Firewall: SSH, HTTP, HTTPS only. Never open 27017 (Mongo) or 6379 (Redis).
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw --force enable
```

Also allow ports 22, 80 and 443 in the hosting provider's firewall or security
group, if it has one.

## 3. Get the code

```bash
cd /root
git clone <repository-url> markup2.0
cd /root/markup2.0
git checkout <branch>        # e.g. master
```

## 4. Configure `.env`

```bash
cp .env.example .env
nano .env
```

Generate each password with (letters and digits only, symbols break
connection URLs):

```bash
openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 10; echo     # passwords
openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 48; echo     # JWT_SECRET
```

Required:

| Setting | Value |
|---|---|
| `API_URL`, `APP_URL`, `ADMIN_URL`, `SITE_URL` | `https://api.kommently.info`, `https://app.…`, `https://admin.…`, `https://kommently.info` (no trailing slash, no `/api`) |
| `API_PORT` | `5000`, or any free port if 5000 is taken on the server |
| `MONGO_PORT` | `27017`, or another port if a Mongo already runs on the host (e.g. `27018`) |
| `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD`, `REDIS_PASSWORD` | generated passwords |
| `BACKUP_PASSPHRASE` | a generated password; **store it somewhere safe**, backups can't be restored without it |
| `JWT_SECRET` | 32+ random characters |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | mail account (port 587 with `SMTP_SECURE` unset, or 465 with `SMTP_SECURE=true`) |
| `COMPANY_POSTAL_ADDRESS` | shown in email footers (required by anti-spam rules) |

Optional: payments (`RAZORPAY_*`, `PAYPAL_*`, section 8), invoice seller
details (`SELLER_*`), error monitoring (`SENTRY_DSN`, `CLIENT_SENTRY_DSN`),
website relay (`FALLBACK_RELAY_URL`, `RELAY_SECRET`, section 8), logs
(`LOG_LEVEL`, `LOG_FORMAT`), worker processes (`WEB_CONCURRENCY`, default:
one per CPU core, max 4).

The per-app files `client/.env`, `admin/.env` and `website/.env` are **not**
used for production; everything comes from the root `.env`.

Keep `.env` private: `chmod 600 .env`.

## 5. Build and start

```bash
docker compose up -d --build --remove-orphans
docker compose ps -a
```

The first build takes a few minutes. Expected result:

| Service | Status |
|---|---|
| `server`, `mongo`, `redis` | `Up … (healthy)` |
| `backup` | `Up` |
| `client`, `admin`, `website`, `uploads-perms` | `Exited (0)`: they did their job and stopped |

```bash
ls client/build admin/build website/build      # each has index.html and static/
curl -s http://127.0.0.1:5000/api/health       # use your API_PORT; db and redis "up"
```

## 6. nginx and HTTPS

```bash
# nginx (user www-data) must be able to enter the repo folder
chmod o+x /root /root/markup2.0

cp deploy/nginx/kommently.conf /etc/nginx/sites-available/kommently.conf
ln -sf /etc/nginx/sites-available/kommently.conf /etc/nginx/sites-enabled/kommently.conf
sh deploy/nginx/apply-env.sh

certbot --nginx -d kommently.info -d www.kommently.info \
  -d app.kommently.info -d admin.kommently.info -d api.kommently.info
```

- `apply-env.sh` reads `API_PORT` and the repo location and writes them to
  `/etc/nginx/conf.d/kommently-env.conf`, then tests and reloads nginx. The
  site file itself never needs editing.
- certbot adds HTTPS to the site file and renews certificates automatically
  (`systemctl list-timers | grep certbot`).
- Remove a leftover default site if it answers for these names:
  `rm -f /etc/nginx/sites-enabled/default && systemctl reload nginx`.

## 7. First-run checks

```bash
curl -s https://api.kommently.info/api/health
curl -sI https://app.kommently.info | head -1        # HTTP/2 200
curl -sI https://kommently.info | head -1            # HTTP/2 200
curl -sI https://admin.kommently.info | head -1      # HTTP/2 200

# Email: network, login and a real test message
docker compose exec server node scripts/checkSmtp.js you@example.com

# The admin account (admin panel login)
docker compose exec server node scripts/createSuperAdmin.js you@example.com '<strong password>'
```

Then in a browser: sign up on the app (the verification code must arrive),
create a website project, drop a pin, add a comment with an image
attachment, and open the admin panel.

## 8. Optional integrations

**Payments.** Set the keys in `.env`, choose the active provider in the admin
panel, and register these webhook URLs with the provider:

| Provider | Webhook URL | `.env` |
|---|---|---|
| Razorpay | `https://api.kommently.info/api/billing/webhook/razorpay` | `RAZORPAY_WEBHOOK_SECRET` |
| PayPal | `https://api.kommently.info/api/billing/webhook/paypal` | `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=live` |

**Website relay** (Cloudflare Worker that loads sites which block the
server). From a machine with `wrangler` logged in:

```bash
cd cloudflare-relay
npx wrangler deploy
npx wrangler secret put RELAY_SECRET      # same value as RELAY_SECRET in .env
```

Put the worker URL in `FALLBACK_RELAY_URL`.

Apply `.env` changes with `docker compose up -d`.

## 9. Updating

```bash
cd /root/markup2.0
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build --remove-orphans
docker compose ps -a
```

- Only changed services are rebuilt and recreated. The API restarts in a few
  seconds; people's open pages reconnect and catch up automatically.
- New frontend files are copied first and `index.html` last, so nobody loads
  half an update. Old build files are removed after 7 days.
- nginx needs no reload for updates.

**Rollback** to an earlier release (no rebuild; images are kept per tag):

```bash
docker image ls kommently/server          # available tags
IMAGE_TAG=<previous sha> docker compose up -d
```

## 10. Changing settings

`docker compose restart` does **not** read `.env` again; use `up -d`.

| What changed in `.env` | Command |
|---|---|
| Server settings (secrets, mail, payments, Sentry, logs, …) | `docker compose up -d` |
| `API_URL`, `APP_URL`, `ADMIN_URL`, `SITE_URL`, `CLIENT_SENTRY_DSN` | `docker compose up -d --build` |
| `API_PORT` | `docker compose up -d && sh deploy/nginx/apply-env.sh` |
| Repo moved to another folder | `sh deploy/nginx/apply-env.sh` (and `chmod o+x` on the new path) |

## 11. Logs

```bash
docker compose logs -f server                 # live, colored, one line per request
docker compose logs --since 1h server | grep -E "WARN|ERROR"
docker compose logs website                   # a frontend build
tail -f /var/log/nginx/error.log
```

Each request line has the method, URL, status, duration, user id and, for
failures, the error message. Passwords, tokens and cookies are never logged.
`LOG_LEVEL=debug|info|warn|error`; `LOG_FORMAT=json` for a log collector.
Unexpected errors also go to Sentry when `SENTRY_DSN` is set.

## 12. Backups and database access

The `backup` service writes an encrypted backup of the database and the
uploads to `deploy/backups/` every 7 days and keeps the newest 8. **Copy that
folder off the server regularly** (e.g. `rsync` to another machine); a backup
on the same disk does not survive losing the server.

Restore the database:

```bash
export BACKUP_PASSPHRASE='<from your safe place>'
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in deploy/backups/mongo-<stamp>.archive.gz.enc \
  | docker compose exec -T mongo mongorestore \
      --uri "mongodb://root:<MONGO_ROOT_PASSWORD>@localhost:27017/?authSource=admin" \
      --gzip --archive --drop
```

Restore the uploads:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE \
  -in deploy/backups/uploads-<stamp>.tar.gz.enc \
  | docker compose run --rm -T --no-deps --user root --entrypoint tar server -xz -C /app/uploads
docker compose up -d     # uploads-perms fixes ownership on the next start
```

Database access from your own machine goes through an SSH tunnel (the
database is never public):

```bash
ssh -N -L 27017:127.0.0.1:<MONGO_PORT> root@<server-ip>
# then connect to mongodb://root:<MONGO_ROOT_PASSWORD>@127.0.0.1:27017/?authSource=admin
```

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `failed to bind host port 127.0.0.1:5000: address already in use` | Another process (often an old copy of the API under pm2/systemd) uses the port | Stop it (`ss -ltnp 'sport = :5000'`), or set another `API_PORT` and run `sh deploy/nginx/apply-env.sh` |
| `failed to bind … :80` | Something besides the host nginx wants port 80 | Only the host nginx listens on 80/443; containers bind to 127.0.0.1 only |
| certbot: `Timeout during connect` | DNS for that name points elsewhere, or port 80 is blocked | Check DNS (section 1), `ufw status`, provider firewall; retry certbot |
| certbot: `NXDOMAIN` | No DNS record for that name | Add the A (or CNAME) record, wait, retry |
| certbot: fails only "during secondary validation" | Some resolvers still see an old IP | Remove old/duplicate records, wait for the TTL, retry |
| Site shows nginx 403 / 500, error log says `Permission denied` | nginx can't enter `/root` | `chmod o+x /root /root/markup2.0` |
| Error log: `rewrite or internal redirection cycle` | The build folder is empty | `docker compose logs website` (or client/admin), then `docker compose up -d --build website` |
| Site still old after an update | Browser cache of `index.html` | Hard refresh (Ctrl+Shift+R); `index.html` is served with `no-cache` |
| App calls `localhost:5000` | Built without the right `API_URL` | Fix `.env`, `docker compose up -d --build` |
| "Server unreachable" when sending a verification code | Server can't reach the mail server (provider blocks SMTP) or wrong login | `docker compose exec server node scripts/checkSmtp.js you@example.com` and follow its hint |
| Uploads fail or files show blank | Uploads volume not writable, or old frontend build | `docker compose ps -a uploads-perms` must be `Exited (0)`; rebuild frontends |
| Server log: `Authentication failed` (Mongo) | The Mongo volume was created with an older password | Put the original password back in `.env`. Only on a fresh install with no data: `docker compose down -v` then `up -d --build` (**deletes the database**) |
| `docker compose` complains about `!reset` / `!override` | Compose older than 2.24 | `apt install docker-compose-plugin` (or reinstall Docker) |
| Container keeps restarting | See its log | `docker compose logs --tail=100 <service>` |

## Local development

The same compose files run the whole stack on your machine with hot reload.
In `docker-compose.override.yml`, comment out the services you want in
development mode (all four for full hot reload), use the local URLs from
`.env.example`, then `docker compose up -d`. API on http://localhost:5000,
app on :8081, admin on :8082, website on :8083. Don't commit the commented
override.
