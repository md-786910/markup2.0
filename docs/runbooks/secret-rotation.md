# Runbook: Secret Rotation

## 1. Overview
Guidelines for rotating production credentials, encryption keys, and gateway webhook secrets without disrupting active user sessions or locking out administrators.

All secrets live in the root `.env` (`/root/markup2.0/.env` on the server). Apply a change with `docker compose up -d`, which recreates the containers whose settings changed. `docker compose restart` does **not** read `.env` again (`DEPLOY.md` section 10). Never print `.env` values.

---

## 2. Secrets Inventory & Risk Matrix

| Secret Variable | Usage | Rotation Risk | Strategy |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | Customer sessions, guest share access tokens, project proxy tokens, unsubscribe links in sent emails; admin session keys and 2FA challenges are derived from it; also the 2FA encryption key when `TWO_FACTOR_KEY` is unset | High (logs out all users and admins, breaks old unsubscribe links) | Schedule during off-peak hours; pin `TWO_FACTOR_KEY` first (section 3) |
| `TWO_FACTOR_KEY` | AES-256-GCM key for stored admin TOTP secrets (`server/utils/secretBox.js`); falls back to a key derived from `JWT_SECRET` | **CRITICAL** | **There is no re-encryption tool: changing it breaks every admin's 2FA, which then has to be reset** (section 4) |
| `RAZORPAY_KEY_SECRET` | Payment verification | Medium | Update in gateway first, then sync `.env` |
| `PAYPAL_CLIENT_SECRET` | PayPal order generation & captures | Medium | Create secondary credential in PayPal developer portal |
| `ADMIN_ALERTS_SLACK_WEBHOOK`| Slack alert notification URL | Low | Replace webhook URL in `.env` |
| `SMTP_PASS` | Outgoing email authentication | Low | Update password in SMTP provider, then update `.env` |

---

## 3. JWT_SECRET Rotation Procedure

> [!CAUTION]
> If `TWO_FACTOR_KEY` is **not** set in `.env`, admin 2FA secrets are encrypted with a key derived from `JWT_SECRET` (`sha256(JWT_SECRET + ":two-factor")`, see `server/utils/secretBox.js`). Rotating `JWT_SECRET` alone then makes every admin's stored 2FA secret unreadable and nobody with 2FA on can sign in to the admin panel.
> Admin session signing (`server/utils/adminSession.js`, `JWT_SECRET + ":admin-session"`) and 2FA challenges (`server/utils/twoFactor.js`) also derive from `JWT_SECRET`; rotating it signs out every admin (expected, harmless).

1. Notify active team members of scheduled re-authentication.
2. Check whether `TWO_FACTOR_KEY` is set (prints only yes/no):
   ```bash
   grep -q '^TWO_FACTOR_KEY=.\+' .env && echo "set" || echo "NOT set"
   ```
   If it is **not** set, add `TWO_FACTOR_KEY` with the value `<old JWT_SECRET>:two-factor` (the current `JWT_SECRET` value followed by the literal text `:two-factor`). That is exactly the material the fallback hashes, so the existing 2FA secrets keep decrypting after `JWT_SECRET` changes. Keep this `TWO_FACTOR_KEY` permanently.
3. Generate a secure 64-character random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   (`JWT_SECRET` must be at least 32 characters or the API refuses to start.)
4. Update `JWT_SECRET` in `.env`.
5. Recreate the backend so it loads the new values:
   ```bash
   docker compose up -d
   ```
6. Verify an admin with 2FA can still sign in to the admin panel.

---

## 4. TWO_FACTOR_KEY Precautions (Important)
> [!CAUTION]
> Changing `TWO_FACTOR_KEY` (or `JWT_SECRET` while `TWO_FACTOR_KEY` is unset) will prevent ALL administrators with 2FA enabled from signing in: their stored `AdminUser.twoFactor.secret` can no longer be decrypted. The code has no tool to re-encrypt the secrets with a new key.
>
> If the key is changed or lost, reset 2FA for each affected admin with [`admin-2fa-reset.md`](./admin-2fa-reset.md) (CLI script, since the portal is unreachable when every admin is affected); they then set up 2FA again at their next sign-in.
