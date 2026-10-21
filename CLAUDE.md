# Markup MVP (Kommently)

Visual feedback SaaS: a team loads a **live website** (via our proxy, inside an iframe) or **uploaded documents** (PDF/images), drops **pins** on it, and discusses each pin in a **comment thread**. Guests review via a public share link. Multi-tenant (organizations), paid plans with trial.

## Repo layout (5 independent apps, no monorepo tooling)

| Dir | What | Stack |
|---|---|---|
| `server/` | API + website proxy + socket.io | Node, Express 5, Mongoose 9, CommonJS |
| `client/` | Main web app | CRA, React 19, react-router 7, Tailwind 3, plain JS (no TS) |
| `admin/` | Superadmin panel (orgs, users, pricing overrides, payment provider) | CRA React 19, Vercel |
| `website/` | Marketing site (`kommently-website`) | CRA React 19, framer-motion, Vercel |
| `cloudflare-relay/` | Worker `markup-relay`: fetches assets for proxied sites, strips XFO/CSP; requires a signed `rt` token when `RELAY_SECRET` is set | Cloudflare Workers |
| `deploy/` | Docker files. Root `docker-compose.yml` runs every service in **dev mode** (source mounted, nodemon / CRA dev servers, deps in per-app volumes); `docker-compose.override.yml` (auto-loaded) switches to **production**: the API runs its image (`deploy/docker/server.Dockerfile`), and client/admin/website become one-shot jobs that build (`deploy/docker/spa.Dockerfile`) and publish static files to `{client,admin,website}/build` in the repo (server repo is `/root/markup2.0`), then exit; locally, comment services out of the override. Dev ports on 127.0.0.1: API 5000, app 8081, admin 8082, site 8083. On the server the host nginx proxies `api.` to `API_PORT` and serves the frontend folders (`deploy/nginx/kommently.conf` + certbot; `deploy/nginx/apply-env.sh` writes the port and repo path from `.env` into `/etc/nginx/conf.d/kommently-env.conf`). See `deploy/README.md` | Docker Compose |
| `plan/` | Todo notes | — |

**One `.env` at the repo root** (template: `.env.example`) configures everything: Docker Compose, the server (`server/config/env.js` loads it and exports `URLS` and `ALLOWED_ORIGINS`; use those, not `process.env.*_URL`), scripts and frontend image builds. Live/testing deployment: `kommently.info` (HTTPS). Local machine: the same stack on `http://localhost:5000` (API), `:8081` (app), `:8082` (admin), `:8083` (website). Cookies are `Secure` only when `API_URL` is HTTPS (`SECURE_COOKIES`). Deploy: `docker compose up -d --build` from the repo root.

Run locally: `docker compose up -d mongo redis`, then `cd server && npm run dev` (port 5000); `cd client && DISABLE_ESLINT_PLUGIN=true npm start` (3000, `setupProxy.js` forwards `/api`, `/uploads`, `/socket.io`; without the env var CRA fails with `Environment key "jest/globals" is unknown`). Redis is optional. Frontends fall back to localhost URLs when run with `npm start`. Never print `.env` values.

Tests: `cd server && npm test` runs `test/smoke.js` (~90 end-to-end checks: tenancy, guest links, proxy SSRF, billing, trials, limits, GDPR, security) against the real app and a throwaway DB (`TEST_MONGODB_URI`, name must end in `_test`; it is dropped). `TEST_REDIS_URL=redis://… npm test` also exercises the Redis paths. The suite stubs every mailer function. `test/emailLinks.js live|local` (also in `npm test`) runs forgot-password, invitation, notification, trial and receipt flows with real templates and checks every email link targets the configured `APP_URL`/`API_URL` and an existing client route. Also verify server edits with `node --check <file>`. Production deps: don't upgrade existing packages without asking.

## Server (`server/`)

- `app.js` middleware order matters. Payment webhooks (`/api/billing/webhook/{razorpay,paypal}`) and `/api/proxy` use `express.raw` and are mounted **before** the JSON parser. After that: mongoSanitize, hpp, globalLimiter, CSRF (double-submit `markup_csrf` cookie + `X-CSRF-Token`; skipped for Bearer, the pre-login `/api/auth/*` endpoints in `PUBLIC_AUTH_PATHS`, `/api/guest/*` and `/api/email/*`), then the routes. JSON body limit is 1mb. Public endpoints: `/api/health` (503 if Mongo is down, reports Redis), `/api/plans` (also returns `signupMode`, `trialDays`), `/api/email/unsubscribe`.
- **Multi-core** (`utils/cluster.js`): with `REDIS_URL` set, `server.js` runs a primary that forks `WEB_CONCURRENCY` workers (default: cores, max 4) sharing the port and replaces crashed ones; workers get `CLUSTER_WORKERS` and socket.io then accepts WebSocket only (long-polling can't span processes). Without Redis it stays single-process. Per-process state (proxy caches, `relayFirstDomains`) is fine to be per worker.
- Proxy upstream requests use shared keep-alive agents (`directHttp(s)Agent`, `relayHttp(s)Agent`); a GET that hits a just-closed kept-alive connection (`ECONNRESET`) is retried once.
- `server.js` loads `instrument.js` (Sentry, no-op without `SENTRY_DSN`; scrubs tokens/passwords/cookies) before anything else, starts the email worker and billing scheduler, and shuts down gracefully on SIGTERM.
- **Redis** (`utils/redis.js`, optional `REDIS_URL`): BullMQ email queue (`utils/emailQueue.js`, retries with backoff), BullMQ daily billing job (`utils/scheduler.js`, runs once across instances), shared rate limits (`middleware/rateLimiters.js`, incl. per-email limits on login/reset/OTP), socket.io Redis adapter. Without Redis everything falls back to memory (single instance). Request-path commands use a fail-fast connection so a Redis outage degrades instead of hanging requests.
- `server.js` sets up socket.io. The JWT comes from `handshake.auth.token` (session token checked; proxy tokens refused). Rooms are `user:<id>` and `project:<id>` (`join:project` checks project access via `resolveAccess`; presence uses `fetchSockets()` so it works across instances). Controllers emit through `req.app.get('io')` with these events: `pin:*`, `comment:*`, `notification:new`, `presence:*`.
- **Auth** (`middleware/auth.js`): reads the JWT from `?token=`, then the Bearer header, then the `markup_token` cookie. A user has one active session at a time (`sessionToken`); a mismatch returns 401 `SESSION_REPLACED`. Auth sets `req.user` and `req.organization` (with plan limits merged in) and runs the trial-expiry check.
- **Roles**: a single `User.role` per user, one of `superadmin` > `owner` > `admin` > `member` > `guest` (`middleware/roles.js` → `authorize()`). Each user belongs to one org (`User.organization`). Project access (`middleware/projectAccess.js` → `resolveAccess`): `Project.owner`, `Project.members[]`, or admin/owner **of the project's own org** (`req.isOrgAdmin`). `pinAccess` does the same for `:pinId` routes (comments). Lookups by child id are scoped to the authorized project (`Pin.findOne({ _id, project })`).
- **Org limits / lock** (`middleware/orgLimits.js`): returns 403 with one of `ORG_LOCKED`, `PROJECT_LIMIT`, `MEMBER_LIMIT`, `GUEST_LIMIT`, `STORAGE_LIMIT`, `FEATURE_NOT_AVAILABLE`. Seats count users plus pending invitations (owner included). Effective limits = plan limits + PlanConfig + per-org `limitOverrides` (`getEffectiveLimitsAsync` in `config/plans.js`). Storage quota (`utils/storage.js`): `Organization.storageUsedBytes` counter, reserved after multer on every upload route, released by the delete cascades.
- **Deletes** go through `utils/cascade.js` (project/pin/comment: child records + files + storage). Uploads keep a mimetype-derived extension; `/uploads` is served with `nosniff`, and non-image/PDF files are sandboxed and downloaded.
- **Guest share links**: every guest endpoint goes through `loadSharedProject` (enabled, expiry, password via the `X-Guest-Access` token issued by `getGuestProject`; writes also need an unlocked org). Share links need a paid plan or trial.
- **Comment HTML** is sanitized on write (`utils/sanitizeComment.js`, Quill allowlist) and again with DOMPurify in `client/src/utils/renderCommentBody.js`.
- **Conventions**: controllers are `exports.fn = asyncHandler(async (req,res)=>…)`. Errors are `res.status(x).json({ message, code? })`. Successes return named objects like `{ project }` or `{ token, user }`, with 201 on create. Routes do `router.use(auth)`, then `projectAccess`, `authorize`, and the limit checks. Activity is logged fire-and-forget with `utils/activityLogger.js`.

### Models (`server/models/`)
- **Organization**: plan (`trial|free|starter|pro|enterprise`), `limits{maxMembers,maxGuests,maxProjects,maxStorageMB,hasIntegrations,hasActivityLogs,hasVersionHistory}`, `limitOverrides` (superadmin), trialEndsAt + `trialReminders`, isLocked/lockedReason, `subscription{status,currentPeriodEnd,provider,cancelAtPeriodEnd,…}`, `billingDetails` (buyer info for invoices), `storageUsedBytes`, `deletionScheduledAt`.
- **Project**: `projectType` is `website` (websiteUrl) or `document` (`documents[]` up to 10, pageCount via pdf-parse). Other fields: members, status (active/archived), projectStatus (workflow), `shareSettings{enabled,token,passwordHash,allowComments,expiresAt}`.
- **Pin**: pageUrl, xPercent/yPercent (doc %), `selector` + elementOffsetX/Y, viewportX/YPercent, documentWidth/Height, deviceMode (desktop 1440/tablet 768/mobile 375), pinNumber (unique per project), screenshot, status pending/resolved, version, createdBy or createdByGuest.
- **Comment**: pin, author/authorGuest, body (HTML from Quill), attachments, parentComment, mentions.
- Also: Version (snapshot; creating one tags un-versioned pins), Invitation (5-day token), Notification, Activity, Integration (slack/jira/discord/teams, org-wide or per project; Jira token masked in responses), Invoice (status `pending|paid|failed|void|refunded`; unique per org+billingMonth; `invoiceNumber`, `seller`/`buyer`/`tax` snapshots), Counter (atomic sequences), PlanConfig (admin price/limit overrides incl. `priceInr`, 5-min cache), PaymentSettings (singleton: activeProvider, allowDowngrades), EmailVerification (OTP, TTL). `User.emailNotificationsEnabled` is the global notification-email opt-out.

### Website proxy (the core trick)
- The iframe src is `/api/proxy?url=…&projectId=…&token=…[&guest=true]`. `token` is a 24h **project-scoped proxy token** (`utils/proxyToken.js`, returned by `GET /projects/:id` and the project list), never the session JWT; the normal auth middleware rejects it. The handlers are `controllers/proxy.controller.js`, `middleware/proxyAuth.js` and `utils/proxyRewriter.js`. Unauthenticated (guest) requests must hit a project with an enabled, unexpired share link.
- SSRF guard (`utils/ssrfGuard.js`): only public http(s) targets; private/loopback/link-local IPs are blocked at DNS lookup and on every redirect (`PROXY_ALLOW_PRIVATE=true` for local dev only). Responses are capped (`PROXY_MAX_BYTES`), caches are bounded.
- The server fetches **directly first** (assets of directly-fetched pages are proxied through Express too). When an origin blocks or throttles the server (bot wall on a page, 403/429/503 on an asset, timeout/reset), it retries through the Cloudflare relay (`FALLBACK_RELAY_URL`, signed `rt` token from `utils/relayToken.js`) and remembers the domain for 1h (`relayFirstDomains`), so that page's assets go via the relay. Last resort: optional `OUTBOUND_PROXY`, then the blocked/error page. Sub-resource auth reads the project proxy token from the `__markup_proxy_ctx` cookie. It strips XFO/CSP and rewrites cookies (never lets the site set `markup_*` cookies).
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
- **Email**: members get emails, respecting `User.emailNotificationsEnabled` and `User.mutedProjectEmails`. `utils/emailQueue.js` batches per recipient for `EMAIL_BATCH_DELAY_MS` (default 5 min) and sends a digest when there are several (Redis/BullMQ when configured, else in memory). Notification emails get an unsubscribe link and `List-Unsubscribe` headers (`utils/unsubscribe.js`, `routes/email.routes.js`); footers show `COMPANY_POSTAL_ADDRESS`. Templates live in `utils/email/templates.js`: pure functions returning `{subject, html, text}`. They're built from the shared blocks in `utils/email/layout.js` (app green theme, table-based, auto-escaped; `**bold**` markup in text). `utils/mailer.js` only sends them. Preview them all with `npm run preview:emails [outDir]`. Set the optional `EMAIL_LOGO_URL` env var to use an image logo instead of the text "K" mark.
- **In-app**: `utils/notificationHelper.js` creates the Notification and emits it.
- **Integrations**: `{slack,discord,teams}Notifier.js` send webhooks. `jiraSync.js` creates an issue on `pin.created`.
- **Mentions**: written as `@[Name](id)` or Quill `data-id` (`utils/mentionHelper.js`).

### Billing
- **Plans** (`config/plans.js`):
  - free: 2 projects
  - starter: $12, 15 projects
  - pro: $29
  - enterprise
  - trial: 30 days, **Pro limits**, no card. New signups land on it; onboarding offers it by default.

  Admin overrides come from PlanConfig.
- **Providers** (`payments/`): Razorpay (INR, `priceInr` or `price × RAZORPAY_USD_INR_RATE`) and PayPal (USD). Both use the same interface, incl. `refundPayment`. `settleInvoice.js` is the single path that marks an invoice paid: atomic claim, assigns the tax invoice number/GST (`invoiceIssuer.js`), activates the plan, sends the receipt. Renewal invoices (`billingMonth` set) don't extend the period again. `refundInvoice.js` records refunds; a full refund of the current period moves the org to free.
- `POST /billing/upgrade` never takes payment: only free, or a downgrade from an active paid plan (else 402). `POST /billing/cancel|resume` (cancel at period end), `GET|PUT /billing/details` (buyer details). Admin: set plan, extend trial, limit overrides, refund (`routes/admin.routes.js`).
- **Daily job** (`scripts/runBilling.js`, scheduled by `BILLING_CRON_ENABLED=true` or `npm run billing`): renewal invoices 24h before `currentPeriodEnd` (skips cancelled), reminders on days 4/7/9, lock after `dueAt` (voids invoices of orgs that left paid plans), ends cancelled subscriptions, trial emails (7/3/1 days) and trial lock, purges orgs past `deletionScheduledAt` (invoices kept), retention (notifications 180d, activity 365d, invitations 30d past expiry). Dates use `utils/billingDates.js` (`addMonthsUTC`). `clearBillingLock` only lifts billing/trial locks, never manual admin locks.
- **GDPR**: `GET /auth/organization/export` (JSON), `POST /auth/organization/delete` (password + name, 7-day grace, locks the org), `POST /auth/organization/cancel-deletion`.

## Client (`client/src/`)
- **Routes** (`App.js`, lazy pages):
  - Public: `/login`, `/signup`, `/onboarding`, `/forgot-password`, `/reset-password/:token`, `/review/:shareToken` (guest).
  - Private: `/dashboard`, `/settings?tab=`, `/integrations`, `/profile`, `/project/:projectId/members`, `/project/:projectId` (no sidebar).
- **API**: `services/api.js` (axios, `REACT_APP_BASE_URL`) sends a Bearer token from localStorage plus the CSRF header. On a 401 it hard-redirects to `/login`. Each domain has a `services/xxxService.js` exporting `xxxApi` functions. `guestService.js` uses its own unauthenticated axios instance.
- **State**: only `AuthContext` (user, role flags `isOwner/isAdmin/isGuest/canManage/canCreate/orgLocked`) and `NotificationContext`. Everything else is local hooks, with no Redux.
- **Core UX**: `components/project/ProjectView.js` (~780 lines) orchestrates `IframeContainer` (scaled device width) / `DocumentViewer` (react-pdf; pageUrl = `doc:<file>:page:<n>`), `PinListSidebar` (~1150 lines, embeds `CommentSidebar`), `NewPinCommentPopup`, and the Version/Activity sidebars. Real-time comes from `hooks/useSocket.js` (`onEvent` returns an unsubscribe).
- **Styling**: everything is inline Tailwind. **`tailwind.config.js` remaps `blue/indigo/violet/purple/cyan/gray` to the green "eco-modern" palette**, so `blue-600` renders as #176B57 green. `styles/design-tokens.js` is documentation only. Radii: rounded-lg inputs, rounded-xl cards, rounded-2xl modals.


## Known issues / gotchas (verify before relying on them)
- Guest proxy iframe requests check only that sharing is enabled and not expired, not the share password (the iframe URL has no share token).
- The proxy and `/uploads` are served from the API origin; moving them to a separate sandbox domain is the remaining structural fix.
- Proxy asset URLs are query-string based (`/api/proxy?url=…`), so bundles that resolve chunks relative to their own script URL (e.g. Webflow's webpack `auto` publicPath) request `/api/<chunk>.js` and 404.
- Storage quota only counts files uploaded after quotas were added.
- Deferred (major-version) dependency upgrades: `nodemailer` 8→10 and `geoip-lite`, each with open npm advisories.
- Invoice numbers can skip a value if a settle fails after the number is assigned (rare).
- Frontend images bake in `REACT_APP_*` at build time: changing a public URL means rebuilding them.
- The API must be on its own host (`API_URL`): proxied review sites run on it and their stray requests rely on the Express catch-all.
- `.claude/` is gitignored, so agents in `.claude/agents/` are local only.
