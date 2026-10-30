# Runbook: Outgoing Email / SMTP Outage

## 1. Overview
Procedure to handle email delivery failures, SMTP outages, queue backlogs, and fallback relay configuration.

---

## 2. Detection & Symptoms
- Customers report not receiving magic links, invitation emails, or password resets.
- Admin alert fired or Sentry logs display `SMTP connection timeout` / `ECONNREFUSED`.
- `server/utils/emailQueue.js` shows growing queue length without dequeuing.

---

## 3. Immediate Troubleshooting Steps

1. **Verify SMTP Configuration:**
   Check `.env` variables on the server:
   ```bash
   echo "Host: $SMTP_HOST, Port: $SMTP_PORT, User: $SMTP_USER"
   ```

2. **Test SMTP Connection Directly:**
   Run the email test script to inspect network error:
   ```bash
   node -e "
   const mailer = require('./server/utils/mailer');
   mailer.verifyConnection().then(() => console.log('SMTP OK')).catch(e => console.error('SMTP Error:', e));
   "
   ```

3. **Check Queue Backlog (Redis):**
   If Redis is running:
   ```bash
   docker compose exec redis redis-cli llen email_queue
   ```

4. **Failover to Alternate Relay Provider:**
   If the primary SMTP host (e.g. SendGrid / Postmark / Mailgun) is experiencing service disruption:
   - Update `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `.env` to secondary relay credentials.
   - Restart server container:
     ```bash
     docker compose restart server
     ```
   - The in-process email queue will automatically flush pending messages through the new relay without dropping messages.

