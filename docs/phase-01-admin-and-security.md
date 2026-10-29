# Phase 1: Admin panel and admin security

**Status: Done** (October 2026). This file records what shipped and where it lives; `CLAUDE.md` → "Admin" has the details.

## What shipped

### Admin panel redesign
- Same look as the app: dark grouped sidebar, top bar with global search (`/` focuses), cards, pills, toasts and confirm dialogs.
- **Overview:** monthly revenue, active trials, active organizations (7 days), unpaid invoices, signups chart, plan mix, "Needs attention" (overdue invoices, trials ending with last activity, locked accounts), recent signups, recent admin actions.
- **Organizations:** search by name/owner/email, filters (plan, status incl. paying, trial ending, unpaid, cancelling, locked), sort, CSV export. Filters live in the URL.
- **Organization page:** header with plan, status and actions (change plan, extend trial, custom limits, lock/unlock); tabs Overview (usage vs limits, engagement, account), People, Projects (workspaces + projects), Billing (subscription, invoices, refunds), Activity, Notes (internal, pinnable).
- **People, Projects, Action log** pages; Plans & pricing and Payment settings got the new header only (full redesign is Phase 6).

### Admin accounts and security
- Admin accounts are a separate model, `AdminUser`, with their own sessions (separate JWT key, 12 h) and endpoints (`/api/admin-auth`). Legacy `User` superadmins move over automatically at server start.
- Two-step sign-in (TOTP + 10 recovery codes), required by default (`ADMIN_REQUIRE_2FA`); secrets encrypted with `TWO_FACTOR_KEY`.
- Several admins: Settings → Admin team (invite by email, resend, disable, remove, reset 2FA), with safeguards for yourself and the last active admin.
- Forgot/reset password in the admin panel (30-minute link), password change (12+ characters), "Your account" page.
- Every admin change to a customer or to the team is in the action log with the admin's name.

## Key files
- Server: `models/AdminUser.js`, `models/AdminNote.js`, `controllers/admin.controller.js`, `controllers/adminAuth.controller.js`, `controllers/adminUsers.controller.js`, `middleware/adminAuth.js`, `utils/{adminSession,totp,secretBox,twoFactor,migrateAdmins}.js`, `routes/{admin,adminAuth}.routes.js`.
- Admin app: `components/common/{ui,StatusBadge,DataTable}.js`, `components/layout/{AdminLayout,AdminSidebar,GlobalSearch}.js`, `components/auth/AuthShell.js`, pages `Dashboard`, `Organizations`, `OrganizationDetail`, `Users`, `UserDetail`, `Projects`, `AuditLog`, `Account`, `AdminTeam`, `Login`, `ForgotPassword`, `ResetPassword`.
- Scripts: `createSuperAdmin.js`, `resetTwoFactor.js`.

## Regression tests
- `server/test/smoke.js` → "Phase 1" section (62 checks): admin sign-in, forced 2FA setup, TOTP and recovery codes (single use, replay refused, regenerate), password change and reset (30-minute admin link, single use, signs out sessions, 2FA stays on), invite → set password → sign in, team safeguards, logout, legacy superadmin move, overview/list/CSV/detail endpoints, every status filter matching the row status, notes (scoped to the org, never in customer exports), lock/unlock and the action log.
- Found and fixed during regression: the Organizations status filters now exclude locked and deleting organizations, exactly like the status shown on each row.

## Launch review fixes (October 2026)
- Tokens in URL paths (admin and customer reset links, invitations, share links incl. `/api/guest/workspace/<token>`) are redacted in the request log and Sentry; the log line uses `originalUrl`.
- The action log now covers plan edits and on/off (`plan.updated`, `plan.toggled`), payment settings (`payment_settings.updated`), notes added/deleted, admin invite resends and support request changes (`support.updated`). Admin entries are kept by the 365-day retention and by the org purge (no customer text in their metadata).
- The legacy admin move keeps a customer who had been promoted to superadmin (back to owner/admin of their org) instead of deleting them.
- 2FA codes and recovery codes are claimed atomically (`useSecondFactor`), so one code can't pass two parallel requests.
- Organizations: search no longer drops the Trial filter; "Trial ends soonest" lists orgs without a trial end last. Overview: "Active trials" leaves out expired/locked trials; "Locked" leaves out orgs being deleted.
- Malformed ids in admin URLs return 404 (`router.param`), malformed `orgId` filters 400.
- The customer CSV export includes every matching organization (read in batches of 500; sorts break ties on `_id`).
- Admin sign-in compares a dummy hash for unknown emails and forgot-password doesn't wait for the send, so timing doesn't reveal who is an admin.
- Tests: "Launch fixes for Phase 1" section in `server/test/smoke.js`.

## Follow-ups carried into later phases
- Plans & pricing and Payment settings full redesign → Phase 6.
- Engagement data from PostHog (time spent, sessions) → Phase 5.
- Support inbox on the organization page → Phase 2.
- Support-agent admin role (tickets only, no billing) → Phase 7.
