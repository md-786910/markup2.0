# Runbook: Outgoing Email / SMTP Outage

## 1. Overview
Procedure to handle email delivery failures, SMTP outages, queue backlogs, and fallback relay configuration.

Two kinds of email are sent:
- **Direct sends** (sign-up verification codes, password resets, invitations, billing and support emails): sent during the request; when SMTP is down the request fails or the email is lost. They are not queued.
- **Notification batches** (pins, comments, mentions, status changes): grouped per recipient and project by `server/utils/emailQueue.js` and sent after `EMAIL_BATCH_DELAY_MS` (default 5 min). With Redis they go through the BullMQ queue `email-batches` (6 attempts with exponential backoff, about 1 hour in total); without Redis they are held in memory.

---

## 2. Detection & Symptoms
- Customers report not receiving verification codes, invitation emails, or password resets.
- Admin alert fired or Sentry logs display `SMTP connection timeout` / `ECONNREFUSED`.
- Server log shows `[email] batch for … failed, will retry` / `failed permanently`, or the BullMQ `email-batches` queue grows (step 3).

---

## 3. Immediate Troubleshooting Steps

1. **Verify SMTP Configuration:**
   Check which `.env` variables are set without printing their values:
   ```bash
   grep -oE '^SMTP_[A-Z]+=' .env
   ```
   Port 587 needs `SMTP_SECURE` unset; port 465 needs `SMTP_SECURE=true`.

2. **Test SMTP Connection Directly:**
   Run the SMTP check script (TCP reachability, login, optional test email, with a hint per error code; prints no passwords):
   ```bash
   docker compose exec server node scripts/checkSmtp.js you@example.com
   # outside Docker: cd server && npm run check:smtp you@example.com
   ```

3. **Check Queue Backlog (Redis):**
   If Redis is running, inspect the BullMQ keys of the `email-batches` queue (Redis needs its password, which the container has in `REDIS_PASSWORD`):
   ```bash
   docker compose exec redis sh -c 'R="redis-cli -a $REDIS_PASSWORD --no-auth-warning";
     echo "waiting: $($R llen bull:email-batches:wait)";
     echo "delayed: $($R zcard bull:email-batches:delayed)";
     echo "active:  $($R llen bull:email-batches:active)";
     echo "failed:  $($R zcard bull:email-batches:failed)"'
   ```
   `delayed` includes batches waiting out the 5-minute batching delay and failed sends waiting for a retry. The events of each batch are in the Redis lists `emailq:events:*`. Without Redis there is no queue to inspect.

4. **Failover to Alternate Relay Provider:**
   If the primary SMTP host (e.g. SendGrid / Postmark / Mailgun) is experiencing service disruption:
   - Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` (and `SMTP_SECURE` if the port changes) in `.env` to secondary relay credentials.
   - Recreate the server container so it reads the new `.env` (`restart` would keep the old values):
     ```bash
     docker compose up -d
     ```
   - Run the check from step 2 again.
   - **With Redis:** queued notification batches survive the restart and are retried through the new relay, as long as they have not used up their 6 attempts (about 1 hour). Batches that failed permanently are not resent.
   - **Without Redis:** the in-memory queue does not survive a restart. On a graceful shutdown the server tries to send pending batches immediately (which fails while SMTP is down); anything left is lost. Direct sends that failed during the outage are never retried: affected users must request a new code or reset link.
