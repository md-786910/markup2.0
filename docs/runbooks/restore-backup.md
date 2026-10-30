# Runbook: Restore Database Backup

## 1. Overview
Procedure to restore MongoDB and Redis state in the event of hardware failure, catastrophic data corruption, or disaster recovery.

---

## 2. MongoDB Restore Procedure

### Tools
- `mongodump` & `mongorestore` CLI tools.
- Target URI: `MONGODB_URI` from `.env`.

### Steps

1. **Verify Backup Archive:**
   Check the integrity and timestamp of your latest automated backup archive:
   ```bash
   ls -lh /backups/kommently/
   ```

2. **Stop Ingestion Traffic (Optional but Recommended):**
   Enable maintenance mode banner via Admin portal or temporarily route proxy traffic to maintenance page:
   ```bash
   # Enable maintenance notice via API or Admin panel
   ```

3. **Execute Restore:**
   ```bash
   mongorestore --uri="$MONGODB_URI" --gzip --archive=/backups/kommently/kommently-backup-YYYY-MM-DD.gz --drop
   ```
   > **Note:** The `--drop` flag will clean existing collections before restoring.

4. **Verify Collection Indices:**
   Start Node shell and verify collection counts and indexes:
   ```bash
   node -e "
   const mongoose = require('mongoose');
   mongoose.connect(process.env.MONGODB_URI).then(async () => {
     const count = await mongoose.connection.db.collection('organizations').countDocuments();
     console.log('Restored organizations:', count);
     process.exit(0);
   });
   "
   ```

---

## 3. Redis Cache Rehydration

Redis caches session rate-limits, email batching queues, and health checks.
If Redis suffers data loss, it automatically degrades safely to memory and rebuilds as traffic flows.

1. **Restart Redis Service:**
   ```bash
   docker compose restart redis
   ```
2. **Ping Redis Status:**
   ```bash
   docker compose exec redis redis-cli ping
   # Expected output: PONG
   ```

