# Runbook: Email is not being sent

Kommently sends sign-up codes, password resets, invitations, notifications,
support replies, receipts and team alerts through the SMTP server in `.env`.
Sign-up codes and password resets wait for the send; everything else goes
through the email queue.

## Symptoms

- People don't get sign-up codes, password resets or invitations.
- Server log lines with `smtp`, `ETIMEDOUT`, `ECONNREFUSED` or `EAUTH`:
  ```bash
  docker compose logs --since 1h server | grep -iE "smtp|mail|EAUTH|ETIMEDOUT|ECONNREFUSED"
  ```

## Diagnose

Run the built-in check. It tests the network, the login and, with an address,
sends a test message, with a hint for each error code. It never prints the
password.

```bash
cd /root/markup2.0
docker compose exec server node scripts/checkSmtp.js              # connection + login
docker compose exec server node scripts/checkSmtp.js you@company.com   # + test email
```

Common causes: the provider is down, the password was changed, the port is
blocked by the host (try 587 instead of 465), or the sending domain lost its
SPF/DKIM records.

## Queue

With Redis, queued notification emails are kept in the BullMQ queue
`email-batches` and retried with backoff, so they go out once SMTP works again.
To see how many are waiting:

```bash
docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning llen bull:email-batches:wait'
```

Without Redis the queue is in memory: emails waiting there are lost if the API
restarts during the outage.

## Switch to another provider

1. Put the other provider's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS` and `SMTP_FROM` in `.env` (keep the old values somewhere safe).
2. Apply and test:
   ```bash
   docker compose up -d
   docker compose exec server node scripts/checkSmtp.js you@company.com
   ```

`docker compose restart` would keep the old settings; use `up -d`.
