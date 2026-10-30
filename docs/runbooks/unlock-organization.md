# Runbook: Unlock an Organization

## 1. Overview
Procedure to unlock an organization that has been restricted (`isLocked: true`) due to overdue billing grace expiration, an expired trial, or a manual lock by an administrator.

Manual lock and unlock are **superadmin-only** (`PATCH /api/admin/organizations/:id/lock|unlock`, `requireAdminRole('superadmin')` in `server/routes/admin.routes.js`). Support admins see the buttons but the server refuses with 403.

---

## 2. Diagnosing Lock Reason

In the Admin Panel (`/organizations/:id`):
- Check the header status badge and the red lock banner.
- The lock reason (`Organization.lockedReason`) is one of:
  - `Payment overdue`: the renewal invoice's 10-day payment grace period (`dueAt`) expired (daily billing job).
  - `Trial expired`: the trial ended without plan selection.
  - `Deletion scheduled`: the owner requested organization deletion (7-day grace).
  - Anything else (default `Locked by admin`): a manual lock by a superadmin, with the reason they entered.

Only `Payment overdue` and `Trial expired` are billing locks. `clearBillingLock` (`server/utils/orgUtils.js`) lifts only those two; every other lock stays until a superadmin unlocks it, so a customer cannot pay their way out of a manual lock.

---

## 3. Unlock Options

### Option 1: Payment Settlement (Self-Serve)
- When the customer pays their outstanding invoice via the in-app billing tab, the payment webhook settles it (`settleInvoice.js`), which calls `clearBillingLock(org)` and unlocks the account immediately, but only for a `Payment overdue` or `Trial expired` lock.

### Option 2: Admin Grace Extension / Manual Unlock
If the customer needs temporary access to settle payment or export project data:

1. **Extend Trial (for Trial Locks):**
   - Click **Extend trial** (or **Extend free trial** for a Free org) in the organization header. Only available for orgs on the trial or free plan.
   - Enter extension days (Support agents: trial plan only, ending at most 14 days from today; Superadmins: up to 365 days).
   - This calls `clearBillingLock` (lifts a `Trial expired` lock, not a manual one) and re-arms trial reminders.

2. **Manual Unlock (superadmin only):**
   - Click **Unlock** in the organization header and confirm.
   - There is no reason field: add an internal note on the organization page explaining why.
   - The organization is restored to active status. Manual unlock clears **any** lock reason; the action is logged as `org.unlocked`.
   - For a `Payment overdue` lock the invoice stays unpaid; the daily job does not lock again for the same invoice.
   - For a `Deletion scheduled` lock, do not use Unlock: the owner cancels the deletion in the app (`POST /api/auth/organization/cancel-deletion`), which also unlocks the org. Unlocking manually leaves the deletion scheduled.
