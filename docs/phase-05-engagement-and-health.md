# Phase 5: Engagement and customer health

**Status: Planned · Size: M (about 1.5 weeks)**

## Goal
In the admin panel, see how much each customer uses the product, who is at risk, and where new signups drop off, from our own data plus PostHog.

## Decisions already made
- Health signals from our database (always available).
- Time spent, sessions and page usage from PostHog's query API; the panel works without it and shows "Connect PostHog".

## What already exists
- `User.lastSeen` (auth middleware, every 5 min), org engagement block on the admin organization page (active members 7/30 days, pins and comments 30 days, guest reviewers, review links), "Active organizations" on the Overview.
- PostHog in the app: page views plus `project_created`, `pin_created`, `comment_posted`, `member_invited`; users identified by id with an `organization` group.

## Scope
**In:** a health score, an at-risk list, a signup-to-activation funnel, PostHog time and session data per organization and per person, more product events.
**Out:** in-app surveys (NPS), session recording.

## New product events (client)
`onboarding_step { step }`, `share_link_created { scope: project|workspace }`, `guest_review_opened` (server-side, no PII), `pin_resolved`, `version_created`, `integration_connected { type }`, `upgrade_clicked { from, to }`, `checkout_started { plan, provider }`, `checkout_completed { plan }`, `approval_given` (Phase 4). Set PostHog group properties on the organization: `plan`, `createdAt`.

## Health score (server, daily)
Computed in the daily job (`scripts/runBilling.js` step or a new `scripts/computeHealth.js` scheduled the same way), stored on `Organization.health`:
```js
health: { score: 0–100, band: 'healthy'|'watch'|'at_risk', reasons: [String], computedAt: Date }
```
Inputs and weights (start simple, tune later):
| Signal | Points |
|---|---|
| Any member active in the last 7 days | 25 |
| Active members ÷ seats ≥ 50% | 15 |
| Pins or comments in the last 14 days | 20 |
| At least one review link on | 10 |
| Guest reviewer activity in the last 30 days | 10 |
| Workspaces or integrations used | 10 |
| No unpaid invoice | 10 |
Bands: ≥ 70 healthy, 40–69 watch, < 40 at risk. `reasons` lists the missing signals in plain words ("No activity for 12 days").

## PostHog data (server)
- Env: `POSTHOG_PERSONAL_API_KEY` (read-only, query scope), `POSTHOG_PROJECT_ID`, reuse `POSTHOG_HOST`.
- `server/utils/posthog.js`: HogQL queries through `POST /api/projects/:id/query/`, results cached 15 minutes (Redis when available).
- Per organization (group key): sessions (30 days), total time, average session length, top pages, events by type, weekly active users.
- Per person: last session, sessions (30 days), time.
- Timeouts of 5 s; on failure return `{ available: false }` and the UI shows a muted note.

## Admin UI
- **Organization page:** health badge in the header with reasons on hover; Engagement card gains "Time in app (30 days)", "Sessions", "Top pages" (from PostHog).
- **Person page:** last session and time spent.
- **Overview:** "At-risk organizations" list (paying or trial, sorted by score, with the top reason), and an activation funnel for signups in the last 30 days: signed up → created a project → first pin → invited someone → shared a link → paid.
- **Organizations list:** Health column and filter.

## Tests
- Smoke: health computation for fixed fixtures (active vs inactive orgs) gives the expected band.
- PostHog helper returns `{ available: false }` without keys and never throws.

## Acceptance criteria
- An admin can open the Overview and see which paying or trial customers need attention, with a reason.
- The funnel shows where signups stop.
- Time spent per organization shows when PostHog is configured, and the panel still works when it isn't.
