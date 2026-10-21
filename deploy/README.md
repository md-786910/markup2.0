# deploy/

Deployment files. The step-by-step guide (first install, HTTPS, updates,
rollback, backups, troubleshooting) is [DEPLOY.md](../DEPLOY.md) in the repo
root.

| Path | What |
|---|---|
| `docker/server.Dockerfile` | API image |
| `docker/spa.Dockerfile` | Production build of client/, admin/ or website/ (static files) |
| `nginx/kommently.conf` | Site file for the host's nginx (API proxy + frontend folders) |
| `nginx/apply-env.sh` | Writes `API_PORT` and the repo path from `.env` into nginx, reloads it |
| `mongo-init/` | Creates the app's least-privilege database user on first start |
| `backup/backup-loop.sh` | Weekly encrypted backup of MongoDB and uploads |
| `backups/` | Backup output (gitignored); copy it off the server |
