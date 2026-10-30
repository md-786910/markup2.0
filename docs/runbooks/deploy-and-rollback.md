# Runbook: Deploy and Rollback

## 1. Overview
This runbook covers zero-downtime deployment, container service orchestration, post-deploy verification, and emergency rollback procedures for Kommently.

---

## 2. Standard Deployment Procedure

### Prerequisites
- All automated test suites passing:
  ```bash
  node server/test/smoke.js
  node server/test/phase7Hardening.js
  ```
- Git working directory clean and merged to `main`.
- Environment files (`.env`) checked and secrets present.

### Steps
1. **Pull Latest Changes:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Build Client & Admin Production Bundles:**
   ```bash
   npm --prefix client run build
   npm --prefix admin run build
   ```

3. **Install Server Dependencies:**
   ```bash
   npm --prefix server ci --omit=dev
   ```

4. **Zero-Downtime Container Restart (Docker Compose):**
   ```bash
   docker compose up -d --build server
   ```

5. **Verify Service Health:**
   ```bash
   curl -f http://localhost:5000/api/health
   # Expected output: {"status":"ok","db":"up","redis":"up"}
   ```

---

## 3. Emergency Rollback Procedure

If the deployment causes critical errors, 5xx spikes, or data issues:

1. **Revert Git to Last Known Good Commit:**
   ```bash
   git log -n 5 --oneline
   git checkout <PREVIOUS_STABLE_COMMIT_HASH>
   ```

2. **Rebuild Frontend Bundles:**
   ```bash
   npm --prefix client run build
   npm --prefix admin run build
   ```

3. **Restart Application Services:**
   ```bash
   docker compose restart server
   ```

4. **Verify Health & Logs:**
   ```bash
   curl -f http://localhost:5000/api/health
   docker compose logs --tail=100 server
   ```

