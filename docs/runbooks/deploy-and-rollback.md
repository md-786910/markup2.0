# Runbook: Deploy and roll back

Production runs from the repo at `/root/markup2.0` with Docker Compose. The
production override builds the API image and the three frontends inside Docker
(`deploy/docker/spa.Dockerfile`), so never build them on the host with
`npm run build`: a host build bakes in the wrong `REACT_APP_*` URLs. Full guide:
[`DEPLOY.md`](../../DEPLOY.md) sections 9–11.

## Before you deploy

- The tests pass on a throwaway database (there is no CI):
  ```bash
  cd server
  TEST_MONGODB_URI=mongodb://127.0.0.1:<port>/kommently_smoke_test npm test
  ```
  plus `node test/phase{3..8}*.js` and `node test/globalTrialSettings.js` with the same kind of `_test` database. Never point them at the production database.
- Note the running release, so you can roll back to it:
  ```bash
  cd /root/markup2.0
  git rev-parse --short HEAD
  docker image ls kommently/server
  ```

## Deploy

```bash
cd /root/markup2.0
git pull
IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build --remove-orphans
docker compose ps -a
```

The frontend jobs (`client`, `admin`, `website`) build, publish to
`{client,admin,website}/build` and exit with code 0; the API restarts in a few
seconds. nginx needs no reload.

## Check

```bash
curl -fsS https://api.kommently.info/api/health     # {"status":"ok","db":"up","redis":"up"}
docker compose logs --since 10m server | grep -E "WARN|ERROR"
docker compose logs client admin website | tail -20  # each ends with the build being published
```

Then sign in to the app and the admin panel once, and open one project.

## Roll back

Images are kept per tag, so a rollback needs no rebuild:

```bash
docker image ls kommently/server            # pick the previous tag
IMAGE_TAG=<previous sha> docker compose up -d
curl -fsS https://api.kommently.info/api/health
```

This rolls back the API. To roll back the frontends too, check out that
commit and rebuild them:

```bash
git checkout <previous sha>
IMAGE_TAG=<previous sha> docker compose up -d --build client admin website
```

`docker compose restart` does not pick up a new image or a changed `.env`;
always use `up -d`. Database changes are not rolled back by this: if a release
changed data, restore from a backup ([restore-backup.md](restore-backup.md)).
