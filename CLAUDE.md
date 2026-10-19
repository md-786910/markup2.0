# Markup MVP (Kommently / feedbackly.online)

Visual feedback SaaS: a team loads a **live website** (via our proxy, inside an iframe) or **uploaded documents** (PDF/images), drops **pins** on it, and discusses each pin in a **comment thread**. Guests review via a public share link. Multi-tenant (organizations), paid plans with trial.

## Repo layout (5 independent apps, no monorepo tooling)

| Dir | What | Stack |
|---|---|---|
| `server/` | API + website proxy + socket.io | Node, Express 5, Mongoose 9, CommonJS |
| `client/` | Main web app | CRA, React 19, react-router 7, Tailwind 3, plain JS (no TS) |
| `admin/` | Superadmin panel (orgs, users, pricing overrides, payment provider) | CRA React 19, Vercel |
| `website/` | Marketing site (`kommently-website`) | CRA React 19, framer-motion, Vercel |
| `cloudflare-relay/` | Worker `markup-relay`: fetches assets for proxied sites, strips XFO/CSP | Cloudflare Workers |
| `plan/` | Todo notes (Sentry, PostHog, mongodump backups) | — |

Run: `cd server && npm run dev` (port 5000); `cd client && DISABLE_ESLINT_PLUGIN=true npm start` (3000, `setupProxy.js` forwards `/api`, `/uploads`, `/socket.io`; without the env var CRA fails with `Environment key "jest/globals" is unknown`). Needs local MongoDB. No real tests. Verify server edits with `node --check <file>`. Billing cron: `node scripts/runBilling.js`, run from system cron daily. Never print `.env` values.

## Server (`server/`)

- `app.js` middleware order matters. Payment webhooks (`/api/billing/webhook/{razorpay,paypal}`) and `/api/proxy` use `express.raw` and are mounted **before** the JSON parser. After that: mongoSanitize, hpp, globalLimiter, CSRF (double-submit `markup_csrf` cookie + `X-CSRF-Token`, skipped for Bearer and `/api/auth`), then the routes. Public endpoints: `/api/health` and `/api/plans`.
- `server.js` sets up socket.io. The JWT comes from `handshake.auth.token`. Rooms are `user:<id>` and `project:<id>` (joined with `join:project`). Controllers emit through `req.app.get('io')` with these events: `pin:*`, `comment:*`, `notification:new`, `presence:*`.
- **Auth** (`middleware/auth.js`): reads the JWT from `?token=`, then the Bearer header, then the `markup_token` cookie. A user has one active session at a time (`sessionToken`); a mismatch returns 401 `SESSION_REPLACED`. Auth sets `req.user` and `req.organization` (with plan limits merged in) and runs the trial-expiry check.
- **Roles**: a single `User.role` per user, one of `superadmin` > `owner` > `admin` > `member` > `guest` (`middleware/roles.js` → `authorize()`). Each user belongs to one org (`User.organization`). Project access comes from `Project.owner` / `Project.members[]` (`middleware/projectAccess.js`).
- **Org limits / lock** (`middleware/orgLimits.js`): returns 403 with one of `ORG_LOCKED`, `PROJECT_LIMIT`, `MEMBER_LIMIT`, `GUEST_LIMIT`, `FEATURE_NOT_AVAILABLE`.
- **Conventions**: controllers are `exports.fn = asyncHandler(async (req,res)=>…)`. Errors are `res.status(x).json({ message, code? })`. Successes return named objects like `{ project }` or `{ token, user }`, with 201 on create. Routes do `router.use(auth)`, then `projectAccess`, `authorize`, and the limit checks. Activity is logged fire-and-forget with `utils/activityLogger.js`.

### Models (`server/models/`)
- **Organization**: plan (`trial|free|starter|pro|enterprise`), `limits{maxMembers,maxGuests,maxProjects,hasIntegrations,hasActivityLogs,hasVersionHistory}`, trialEndsAt, isLocked/lockedReason, `subscription{status,currentPeriodEnd,provider,…}`.
- **Project**: `projectType` is `website` (websiteUrl) or `document` (`documents[]` up to 10, pageCount via pdf-parse). Other fields: members, status (active/archived), projectStatus (workflow), `shareSettings{enabled,token,passwordHash,allowComments,expiresAt}`.
- **Pin**: pageUrl, xPercent/yPercent (doc %), `selector` + elementOffsetX/Y, viewportX/YPercent, documentWidth/Height, deviceMode (desktop 1440/tablet 768/mobile 375), pinNumber (unique per project), screenshot, status pending/resolved, version, createdBy or createdByGuest.
- **Comment**: pin, author/authorGuest, body (HTML from Quill), attachments, parentComment, mentions.
- Also: Version (snapshot; creating one tags un-versioned pins), Invitation (5-day token), Notification, Activity, Integration (slack/jira/discord/teams, org-wide or per project), Invoice (unique per org+billingMonth), PlanConfig (admin price/limit overrides, 5-min cache), PaymentSettings (singleton: activeProvider, allowDowngrades), EmailVerification (OTP, TTL).

### Website proxy (the core trick)
- The iframe src is `/api/proxy?url=…&projectId=…&token=…[&guest=true]`. The handlers are `controllers/proxy.controller.js`, `middleware/proxyAuth.js` and `utils/proxyRewriter.js`.
- The server fetches through the Cloudflare relay (`FALLBACK_RELAY_URL`) first, then directly (with optional `OUTBOUND_PROXY`). It strips XFO/CSP and rewrites cookies.
- It sets the `__markup_proxy_ctx` cookie. A catch-all in `app.js` 307-redirects stray non-API requests that carry this cookie back into the proxy.
- `proxyRewriter.js` rewrites the HTML with cheerio (links, srcset, CSS `url()`, strips `integrity`). It then **injects a script** that:
  - patches fetch/XHR/history;
  - draws the pin overlay;
  - takes screenshots with html2canvas (served from `/api/vendor`).
- Pin rendering uses `querySelector(selector)` plus the element offset, and falls back to the document percentages. It re-renders on scroll/animation and at 0.5/1.5/3/6s after load.
- **postMessage protocol** (all `MARKUP_*`). Client side is `client/src/hooks/useIframeMessages.js`.
  - iframe → parent: `READY`, `NAVIGATING`, `SCROLL`, `CLICK`, `SCREENSHOT`, `PIN_CLICK`
  - parent → iframe: `NAVIGATE`, `PIN_MODE`, `UPDATE_PINS`, `SELECT_PIN`

### Notifications
`utils/notifier.js` is the hub.
- **Email**: members get emails, respecting `User.mutedProjectEmails` (the per-project toggle). `utils/emailQueue.js` batches per recipient for `EMAIL_BATCH_DELAY_MS` (default 5 min) and sends a digest when there are several. The queue is in-memory, so it is lost on restart. Templates live in `utils/email/templates.js`: pure functions returning `{subject, html, text}`. They're built from the shared blocks in `utils/email/layout.js` (app green theme, table-based, auto-escaped; `**bold**` markup in text). `utils/mailer.js` only sends them. Preview them all with `npm run preview:emails [outDir]`. Set the optional `EMAIL_LOGO_URL` env var to use an image logo instead of the text "K" mark.
- **In-app**: `utils/notificationHelper.js` creates the Notification and emits it.
- **Integrations**: `{slack,discord,teams}Notifier.js` send webhooks. `jiraSync.js` creates an issue on `pin.created`.
- **Mentions**: written as `@[Name](id)` or Quill `data-id` (`utils/mentionHelper.js`).

### Billing
- **Plans** (`config/plans.js`):
  - free: 2 projects
  - starter: $12, 15 projects
  - pro: $29
  - enterprise
  - trial: 30 days with free limits

  Admin overrides come from PlanConfig.
- **Providers** (`payments/`): Razorpay (INR, `price*84*100` paise) and PayPal (USD). Both use the same interface. `settleInvoice.js` is the single idempotent path that marks an invoice paid and activates the plan.
- **Cron** (`scripts/runBilling.js`): creates an invoice 24h before `currentPeriodEnd`. Sends reminders on days 4, 7 and 9. After `dueAt` (10 days) it locks the org with "Payment overdue". `clearBillingLock` only lifts billing/trial locks, never manual admin locks.

## Client (`client/src/`)
- **Routes** (`App.js`, lazy pages):
  - Public: `/login`, `/signup`, `/onboarding`, `/forgot-password`, `/reset-password/:token`, `/review/:shareToken` (guest).
  - Private: `/dashboard`, `/settings?tab=`, `/integrations`, `/profile`, `/project/:projectId/members`, `/project/:projectId` (no sidebar).
- **API**: `services/api.js` (axios, `REACT_APP_BASE_URL`) sends a Bearer token from localStorage plus the CSRF header. On a 401 it hard-redirects to `/login`. Each domain has a `services/xxxService.js` exporting `xxxApi` functions. `guestService.js` uses its own unauthenticated axios instance.
- **State**: only `AuthContext` (user, role flags `isOwner/isAdmin/isGuest/canManage/canCreate/orgLocked`) and `NotificationContext`. Everything else is local hooks, with no Redux.
- **Core UX**: `components/project/ProjectView.js` (~780 lines) orchestrates `IframeContainer` (scaled device width) / `DocumentViewer` (react-pdf; pageUrl = `doc:<file>:page:<n>`), `PinListSidebar` (~1150 lines, embeds `CommentSidebar`), `NewPinCommentPopup`, and the Version/Activity sidebars. Real-time comes from `hooks/useSocket.js` (`onEvent` returns an unsubscribe).
- **Styling**: everything is inline Tailwind. **`tailwind.config.js` remaps `blue/indigo/violet/purple/cyan/gray` to the green "eco-modern" palette**, so `blue-600` renders as #176B57 green. `styles/design-tokens.js` is documentation only. Radii: rounded-lg inputs, rounded-xl cards, rounded-2xl modals.

## Known issues / gotchas (verify before relying on them)
- `middleware/projectAccess.js`: any `admin`/`owner` passes for **any** project with no org check, so cross-tenant access is possible.
- Guest pin/comment endpoints (`controllers/guest.controller.js`) don't re-check the share password or expiry; only `getGuestProject` does.
- Proxy: no SSRF/private-IP guard, `url` isn't restricted to `project.websiteUrl`, and sub-resources trust the proxy cookie without a DB check.
- `POST /api/billing/upgrade` switches the plan and clears billing locks before payment (and creates no invoice, so month 1 goes unbilled).
- Monthly invoicing (deferred, not fixed):
  - `settleInvoice` extends `currentPeriodEnd` by one more month when a cron invoice is paid. `runBilling.js` already moved it forward, so orgs end up billed every other month.
  - Nothing in the repo schedules `runBilling.js`. It needs an external crontab.
  - `setMonth(+1)` overflows (Jan 31 → Mar 3) and mixes local time with UTC.
- The free plan's `features` text says 3 projects, but `maxProjects` is 2. The `app.js` comment says a 1mb body limit, but the actual limit is 10mb.
- `.claude/` is gitignored, so agents in `.claude/agents/` are local only.
