# Runbook: Unlock an Organization

## 1. Overview
Procedure to unlock an organization that has been restricted due to overdue billing grace expiration (`isLocked: true`) or manually locked by an administrator.

---

## 2. Diagnosing Lock Reason

In the Admin Panel (`/organizations/:id`):
- Check the header status badge.
- View the **Status** field:
  - `Payment overdue`: 10-day payment grace period expired.
  - `Trial expired`: 30-day trial ended without plan selection.
  - `Manual lock`: Administrator intervention.

---

## 3. Unlock Options

### Option 1: Payment Settlement (Self-Serve)
- When the customer pays their outstanding invoice via the in-app billing tab, the payment gateway webhook automatically calls `clearBillingLock(org)` and unlocks the account immediately.

### Option 2: Admin Grace Extension / Manual Unlock
If the customer needs temporary access to settle payment or export project data:

1. **Extend Trial (for Trial Locks):**
   - Click **Extend Trial** in the organization overview.
   - Enter extension days (Support agents up to 14 days, Superadmins up to 365 days).
   - This automatically resets `isLocked = false` and re-arms trial reminders.

2. **Manual Unlock (for Invoiced Orgs):**
   - Click **Unlock Organization** in the Actions dropdown.
   - Enter reason in internal note.
   - The organization is restored to active status.

