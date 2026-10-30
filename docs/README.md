# Kommently implementation plan

One file per phase, in the order we build them. Each phase is a shippable unit: it can go to production on its own, behind plan rules where needed.

Read [`CLAUDE.md`](../CLAUDE.md) first for how the codebase works. These docs describe what to build next and where it goes.

## Roadmap

### Launch track: before and around the public launch

| # | Phase | Status | Size | Why now |
|---|---|---|---|---|
| 1 | [Admin panel and admin security](phase-01-admin-and-security.md) | Done | — | See and act on every customer; secure staff access |
| 2 | [Support by plan](phase-02-support-by-plan.md) | Done | M | Every customer can reach us through the channel their plan includes |
| 3 | [Developer-ready reports](phase-03-developer-ready-reports.md) | Done | S | Browser, OS, console errors on every pin; closes Marker.io's main edge |
| 4 | [Client approvals and feedback deadlines](phase-04-client-approvals.md) | Done | M | Formal sign-off is the agency selling point |
| 5 | [Engagement and customer health](phase-05-engagement-and-health.md) | Done | M | Know which customers are active, stuck or at risk |
| 6 | [Pricing and revenue](phase-06-pricing-and-revenue.md) | Done | M | Plan editor, revenue view, renewals and unpaid invoices |
| 7 | [Launch hardening](phase-07-launch-hardening.md) | Done | S | Alerts, support-agent role, tests, runbooks |

### Growth track: first months after launch

| # | Phase | Status | Size | Why |
|---|---|---|---|---|
| 8 | [Task workflow](phase-08-task-workflow.md) | Done | M | Assignee, priority, due date, board view (BugHerd's core) |
| 9 | [AI pack and MCP server](phase-09-ai-and-mcp.md) | Planned | M | Auto titles, duplicates, round summaries; Claude/Cursor access |
| 10 | [More integrations](phase-10-integrations.md) | Planned | S each | Linear, ClickUp, Asana, Trello, GitHub Issues |
| 11 | [Fallback for sites that block the proxy](phase-11-blocked-site-fallback.md) | Planned | L | Removes our biggest failure case |
| 12 | [Media and agency extras](phase-12-media-and-agency-extras.md) | Later | M–L | Video/voice comments, video review, breakpoints side by side, white label |

Sizes: S is up to about 3 days, M about 1–2 weeks, L more than 2 weeks, for one developer.

## Where we stand against competitors (October 2026)

Summary of the research behind the growth track. Sources are listed in each phase.

- **Our strengths:** no install for reviewers (proxy), live sites plus PDFs and images, guests without accounts, workspaces per client with one review link, access levels, and a $12 flat Starter plan (BugHerd about $41, Marker.io about $39, MarkUp.io $79, Pastel $29).
- **Table stakes we lack:** technical context per report (Marker.io, Huddlekit, Userback), a task board (BugHerd), AI titles/tags/duplicates (BugHerd, Userback), an MCP server for coding assistants (BugHerd, Userback, Huddlekit), formal sign-off and feedback deadlines (BugHerd, Ybug, Ziflow), more integrations.
- **Our biggest risk:** sites with bot protection block the proxy. Competitors avoid this with a script snippet or browser extension (Phase 11).

Positioning to aim for after phases 2–4: *client review to sign-off, with developer-ready reports, at a flat price.*

## Conventions for every phase

- **Plan rules** live in `server/config/plans.js` (`limits` plus a feature list for the pricing pages), are overridable per plan (PlanConfig) and per organization (`limitOverrides`). New paid features use a `has<Feature>` limit and show `common/LockedFeature` in the app when missing.
- **Server:** controllers `exports.fn = asyncHandler(...)`, errors `{ message, code? }`, routes `auth` → access middleware → limit checks. Customer changes go to `Activity` (`utils/activityLogger.js`); admin changes use `logAdminAction`.
- **Emails:** new templates in `utils/email/templates.js` built from `utils/email/layout.js`; add each to `npm run preview:emails` and, if it has links, to `test/emailLinks.js`.
- **Analytics:** product events from the client services via `track()` (`monitoring/analytics.js`); never send names, emails or comment text.
- **Tests:** every phase adds checks to `server/test/smoke.js` (tenancy, access, plan rules) and passes `npm test`.
- **Docs:** when a phase ships, set its status here to Done, add a short "Shipped" note at the top of its file, and update `CLAUDE.md`.
- **UI copy:** sentence case, plain words, no uppercase eyebrows in the app; Inter, brand blue, resolved is always green.
