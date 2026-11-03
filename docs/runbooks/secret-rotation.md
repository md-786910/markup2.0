# Runbook: Rotate a secret

All secrets live in the repo-root `.env` on the server. After editing it, apply
it with `docker compose up -d` (**not** `restart`, which keeps the old values).
Never print `.env` values into a shared terminal or chat.

## What each secret protects

| Variable | Rotating it… | Plan |
|---|---|---|
| `JWT_SECRET` | Signs everyone out (customers and admins), invalidates open 2FA sign-in steps, 24 h proxy tokens (review iframes reload), and the unsubscribe links in emails already sent. **If `TWO_FACTOR_KEY` is not set, it also makes every admin's 2FA unreadable** (see below). | Off-peak; set `TWO_FACTOR_KEY` first |
| `TWO_FACTOR_KEY` | Makes every stored admin 2FA secret unreadable | Don't rotate; if lost, reset 2FA per admin |
| `RELAY_SECRET` | Must match the Cloudflare worker's secret, or relayed sites stop loading | Update the worker and `.env` together |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payments / webhooks fail until both sides match | Create the new key in Razorpay, update `.env`, then revoke the old key |
| `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | Same as above for PayPal | Same order |
| `SMTP_PASS` | Email stops until it matches the provider | Change at the provider, update `.env`, run `npm run check:smtp` |
| `MONGO_*_PASSWORD`, `REDIS_PASSWORD` | The existing volumes keep the old password | Change it inside Mongo/Redis first; see `DEPLOY.md` troubleshooting |
| `BACKUP_PASSPHRASE` | Old backups still need the old passphrase | Keep the old one with the old backups |
| `ADMIN_ALERTS_SLACK_WEBHOOK` | Alerts go to the new webhook | Replace and apply |

## Rotate `JWT_SECRET`

1. Make sure `TWO_FACTOR_KEY` is set in `.env`. If it is empty, the 2FA
   secrets are encrypted with a key derived from `JWT_SECRET`: set
   `TWO_FACTOR_KEY` **before** rotating and plan to reset 2FA for every admin
   (`node scripts/resetTwoFactor.js <email>`), because their current secrets
   can't be read with the new key.
2. Generate a new value:
   ```bash
   openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 48; echo
   ```
3. Put it in `.env`, then apply:
   ```bash
   cd /root/markup2.0 && docker compose up -d
   curl -fsS https://api.kommently.info/api/health
   ```
4. Everyone signs in again. Admins whose 2FA was reset set it up again at
   their next sign-in.

## Lost `TWO_FACTOR_KEY`

Admins with 2FA can no longer sign in. For each one:

```bash
docker compose exec server node scripts/resetTwoFactor.js <admin email>
```

See [admin-2fa-reset.md](admin-2fa-reset.md).
