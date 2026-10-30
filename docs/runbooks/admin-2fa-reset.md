# Runbook: Reset Admin Two-Factor Authentication (2FA)

## 1. Overview
When an administrator loses their authenticator device, does not have backup recovery codes, and cannot sign in to the Admin Portal, another superadmin or a system engineer can reset their 2FA credentials.

---

## 2. Option A: Superadmin Portal (Recommended)
If another active superadmin can sign in to the Admin Portal (the reset is superadmin-only, `POST /api/admin/admins/:adminId/reset-2fa`; nobody can reset their own 2FA here):

1. Navigate to **Settings** → **Admin team** (`/admins`).
2. Find the target administrator (the button only shows for active admins with 2FA on).
3. Click **Reset 2FA** on their row.
4. Confirm the prompt.
5. The admin's 2FA is turned off and all their sessions are signed out. Upon next login, they will be prompted to register a new authenticator app (2FA is required for admins unless `ADMIN_REQUIRE_2FA=false`). The reset is logged as `admin.two_factor_reset`.

---

## 3. Option B: CLI Emergency Script (Direct Database)
If no other superadmin can sign in or the portal is unreachable:

1. SSH into the server and go to the repo (`cd /root/markup2.0`).
2. Run the reset script inside the API container:
   ```bash
   docker compose exec server node scripts/resetTwoFactor.js <admin_email>
   ```
   *Example:*
   ```bash
   docker compose exec server node scripts/resetTwoFactor.js admin@kommently.com
   ```
   (Outside Docker: `cd server && node scripts/resetTwoFactor.js <admin_email>`.)
3. The script will safely:
   - Turn off 2FA (`twoFactor` reset: secret and recovery codes cleared).
   - Rotate the `sessionToken` to invalidate any compromised active sessions.
   - Output confirmation of successful reset.
4. Have the administrator log in with their email and password; they will be guided to re-bind a fresh authenticator code.
