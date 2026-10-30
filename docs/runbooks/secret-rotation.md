# Runbook: Secret Rotation

## 1. Overview
Guidelines for rotating production credentials, encryption keys, and gateway webhook secrets without disrupting active user sessions or locking out administrators.

---

## 2. Secrets Inventory & Risk Matrix

| Secret Variable | Usage | Rotation Risk | Strategy |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | User and guest authentication tokens | High (logs out all users) | Schedule during off-peak hours |
| `TWO_FACTOR_KEY` | AES encryption key for TOTP secrets | **CRITICAL** | **Never rotate without re-encrypting `AdminUser.twoFactor.secret` in DB first** |
| `RAZORPAY_KEY_SECRET` | Payment verification | Medium | Update in gateway first, then sync `.env` |
| `PAYPAL_CLIENT_SECRET` | PayPal order generation & captures | Medium | Create secondary credential in PayPal developer portal |
| `ADMIN_ALERTS_SLACK_WEBHOOK`| Slack alert notification URL | Low | Replace webhook URL in `.env` |
| `SMTP_PASS` | Outgoing email authentication | Low | Update password in SMTP provider, then update `.env` |

---

## 3. JWT_SECRET Rotation Procedure

1. Notify active team members of scheduled re-authentication.
2. Generate a secure 64-character random string:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Update `JWT_SECRET` in `.env`.
4. Gracefully restart backend:
   ```bash
   docker compose restart server
   ```

---

## 4. TWO_FACTOR_KEY Precautions (Important)
> [!CAUTION]
> Changing `TWO_FACTOR_KEY` without decrypting and re-encrypting the database `AdminUser.twoFactor.secret` fields will prevent ALL administrators with 2FA enabled from generating valid TOTP verification tokens!
>
> If `TWO_FACTOR_KEY` is accidentally lost, run [`admin-2fa-reset.md`](./admin-2fa-reset.md) to recover access.

