# Runbook: Deploy and Rollback

## 1. Overview
This runbook covers deployment, container service orchestration, post-deploy verification, and emergency rollback procedures for Kommently.

The authoritative reference is `DEPLOY.md` (sections 9 and 10). On the server the repo is at `/root/markup2.0`; run every command as root from there. `docker-compose.override.yml` (loaded automatically, never edited on the server) makes `docker compose` run production: the API from its image and the frontends as one-shot build jobs that publish to `{client,admin,website}/build`.

---

## 2. Standard Deployment Procedure

### Prerequisites
- All automated test suites passing (CI runs them on every push; locally they need `TEST_MONGODB_URI` pointing at a database whose name ends in `_test`, which is dropped):
  ```bash
  cd server
  npm test                          # smoke.js + emailLinks.js
  node test/phase7Hardening.js      # and the other phase tests CI runs
  ```
- Git working directory clean and merged to `master`.
- Environment file (`.env` in the repo root) checked and secrets present.

### Steps
1. **Pull Latest Changes:**
   ```bash
   cd /root/markup2.0
   git checkout master
   git pull origin master
   ```

2. **Build and Start (API image + client/admin/website builds):**
   Tag the images with the commit so you can roll back to them later:
   ```bash
   IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build --remove-orphans
   docker compose ps -a
   ```
   - Do not build the frontends on the host (`npm run build`) or install server dependencies there: the images do both (`deploy/docker/spa.Dockerfile`, `deploy/docker/server.Dockerfile`).
   - Only changed services are rebuilt and recreated. The API restarts in a few seconds; open pages reconnect automatically.
   - Expected: `server`, `mongo`, `redis` `Up (healthy)`, `backup` `Up`, `client`, `admin`, `website`, `uploads-perms` `Exited (0)`.

3. **Verify Service Health:**
   The API listens on `127.0.0.1:<API_PORT>` (`API_PORT` from `.env`, default 5000):
   ```bash
   curl -fsS https://api.kommently.info/api/health
   # or: curl -fsS http://127.0.0.1:<API_PORT>/api/health
   # Expected output: {"status":"ok","db":"up","redis":"up"}
   ```
   `/api/health` answers 503 when Mongo is down and `"status":"degraded"` when Redis is down.

---

## 3. Emergency Rollback Procedure

If the deployment causes critical errors, 5xx spikes, or data issues, switch back to the images of the previous release. Images are kept per `IMAGE_TAG`, so no rebuild is needed.

1. **Find the Last Known Good Tag:**
   ```bash
   docker image ls kommently/server          # available tags (short commit SHAs)
   git log -n 5 --oneline
   ```
   Only releases deployed with `IMAGE_TAG=...` have their own tag; a deploy without it overwrote `latest`. If the good release has no image, check out that commit and deploy it as in section 2 (`IMAGE_TAG=$(git rev-parse --short HEAD) docker compose up -d --build`).

2. **Start the Previous Images:**
   ```bash
   IMAGE_TAG=<PREVIOUS_STABLE_SHA> docker compose up -d
   ```
   This recreates the API and re-runs the client/admin/website publish jobs from the old images. Do **not** use `git checkout <sha>` + `docker compose restart server`: `restart` keeps the current image and does not read `.env` again.

3. **Keep the Tag Pinned:**
   Every later `docker compose up -d` without `IMAGE_TAG` falls back to `latest` (the broken release). Pass `IMAGE_TAG=<PREVIOUS_STABLE_SHA>` on each compose command until a fixed release is deployed.

4. **Verify Health & Logs:**
   ```bash
   curl -fsS https://api.kommently.info/api/health
   docker compose ps -a
   docker compose logs --tail=100 server
   ```
