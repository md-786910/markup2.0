# Phase 7: Launch hardening

**Status: Done (launch review fixes November 2026) · Size: S (about 3–4 days)**

> **Launch review fixes (Nov 2026):** alert emails were never sent (`mailer.send` is not exported): they now use the escaped `adminAlert` template via `sendAdminAlertEmail`, link to the admin panel (`URLS.admin`), and Slack text is escaped; payment-failed (both providers) and new-paying-customer alerts are wired; overdue-ticket alerts go out once (`SupportTicket.overdueAlertedAt`). Support agents: the admin panel hides Plans, Revenue, Payments, Admin team and Action log (`SuperadminRoute`), invites pick a role, superadmins can change a role (`PATCH /api/admin/admins/:id/role`), agents can add at most 14 days to a trial in total and can't turn a free org into a trial, and the action log records `metadata.adminRole`. There is no CI pipeline for now (the GitHub Actions workflow was removed): run `npm test`, the phase tests and the builds before deploying; the phase test files refuse any database not ending in `_test`. Runbooks rewritten to match `DEPLOY.md`. Then: the site notice has an editor (admin → Site notice, superadmin only; links must be `https://` or an app path, dates checked) and shows as a bar on every page of the app, the sign-in and the review pages (`client/src/components/common/SiteNoticeBanner.js`, closed notices stay closed until they change); bursts of server errors alert the team (`utils/errorSpike.js`, `ERROR_ALERT_THRESHOLD`, default 20 in 5 minutes, at most every 30 minutes, proxy 502s left out); uptime monitoring is described in `DEPLOY.md`.

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
