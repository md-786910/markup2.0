# Phase 7: Launch hardening

**Status: Done · Size: S (about 3–4 days)**

## Goal
Be alerted when something important happens, give support staff a safe role, and make the launch boring.

## Scope
1. **Admin alerts (Slack or email):** new urgent ticket, ticket overdue, payment failed or invoice overdue, new paid customer, refund issued, org locked, server error spike (from Sentry). Config: `ADMIN_ALERTS_SLACK_WEBHOOK`, `ADMIN_ALERTS_EMAIL`; `server/utils/adminAlerts.js` with one function per event, fire-and-forget.
2. **Support-agent admin role:** `AdminUser.role: 'superadmin' | 'support'`. Support can read customers and handle tickets, notes and trial extensions up to 14 days; cannot change plans, limits, refunds, payment settings, pricing or the admin team. Enforced with `requireAdminRole('superadmin')` on those routes; the admin UI hides what the role can't do.
3. **Business hours for ticket due dates:** `SUPPORT_HOURS` (e.g. `Mon-Fri 09:00-18:00 Asia/Kolkata`), used by Phase 2's `dueAt`.
4. **Status page and maintenance banner:** `/api/health` already exists; add an uptime monitor (Better Stack or UptimeRobot) and an admin-controlled banner text shown in the app (`PaymentSettings`-style singleton `SiteNotice`).
5. **Runbooks in `docs/runbooks/`:** deploy and rollback, restore a backup, rotate secrets (never `TWO_FACTOR_KEY` without a plan), reset an admin's 2FA, handle a refund, unlock an organization, SMTP down.
6. **Tests:** extend smoke for support role permissions and alerts (stubbed); run `npm test` in CI on every push (GitHub Actions with Mongo + Redis services).
7. **Security review:** run `/security-review` on the launch branch; check rate limits on every public endpoint; confirm `ADMIN_REQUIRE_2FA` is on in production.

## Acceptance criteria
- A failed payment or urgent ticket reaches the team within a minute.
- A support agent can work tickets but cannot change billing.
- Any engineer can follow a runbook to deploy, roll back or restore.
