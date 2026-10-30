# Runbook: Reset Admin Two-Factor Authentication (2FA)

## 1. Overview
When an administrator loses their authenticator device, does not have backup recovery codes, and cannot sign in to the Admin Portal, superadmins or system engineers can reset their 2FA credentials.

---

## 2. Option A: Superadmin Portal (Recommended)
If another active superadmin has access to the Admin Portal:

1. Navigate to **Admin Team** (`/admins`).
2. Find the target administrator.
3. Click the `...` action menu and select **Reset 2FA**.
4. Confirm the prompt.
5. The admin's 2FA requirement will reset to pending. Upon next login, they will be prompted to register a new authenticator app.

---

## 3. Option B: CLI Emergency Script (Direct Database)
If all superadmins are locked out or the portal is unreachable:

1. SSH into the server or access the server container shell.
2. Run the secure reset script:
   ```bash
   node server/scripts/resetTwoFactor.js <admin_email>
   ```
   *Example:*
   ```bash
   node server/scripts/resetTwoFactor.js admin@kommently.com
   ```
3. The script will safely:
   - Clear `twoFactor.enabled`, `twoFactor.secret`, and recovery codes.
   - Rotate the `sessionToken` to invalidate any compromised active sessions.
   - Output confirmation of successful reset.
4. Have the administrator log in with their email and password; they will be guided to re-bind a fresh authenticator code.

