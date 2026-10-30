const express = require("express");
const mongoose = require("mongoose");
const { pingRedis } = require("./utils/redis");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { mongoSanitize } = require("./middleware/sanitize");
const hpp = require("hpp");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/project.routes");
const pinRoutes = require("./routes/pin.routes");
const commentRoutes = require("./routes/comment.routes");
const proxyRoutes = require("./routes/proxy.routes");
const invitationRoutes = require("./routes/invitation.routes");
const billingRoutes = require("./routes/billing.routes");
const guestRoutes = require("./routes/guest.routes");
const versionRoutes = require("./routes/version.routes");
const integrationRoutes = require("./routes/integration.routes");
const adminRoutes = require("./routes/admin.routes");
const notificationRoutes = require("./routes/notification.routes");

const {
  authLimiter,
  adminLimiter,
  globalLimiter,
} = require("./middleware/rateLimiters");
const { verifyCsrf } = require("./middleware/csrf");
const { ALLOWED_ORIGINS } = require("./config/env");
const { httpLogger, captureErrorMessage } = require("./utils/logger");

// Fail fast if JWT_SECRET is missing or weak — refuse to boot rather than
// silently issue forgeable tokens with a default fallback.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    "FATAL: JWT_SECRET is missing or shorter than 32 characters. Refusing to start.",
  );
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

// Request log (first, so every request is captured, incl. webhooks and proxy)
app.use(httpLogger);
app.use(captureErrorMessage);

// Middleware
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  }),
);
// CORS allowlist: the app, admin and website URLs from .env (+ EXTRA_CORS_ORIGINS).
// Localhost matches in dev only.
const LOCALHOST_RE = /^https?:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== "production" && LOCALHOST_RE.test(origin))
        return cb(null, true);
      // Not allowed: answer without CORS headers so the browser blocks it
      return cb(null, false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Guest-Access"],
    credentials: true,
  }),
);
app.use(cookieParser());

// Payment webhooks need raw body (mounted BEFORE json parser) so HMAC/signature
// verification can hash the exact bytes the provider sent.
const { handleRazorpayWebhook } = require("./controllers/razorpay.webhook");
const { handlePaypalWebhook } = require("./controllers/paypal.webhook");
app.post(
  "/api/billing/webhook/razorpay",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);
app.post(
  "/api/billing/webhook/paypal",
  express.raw({ type: "application/json" }),
  handlePaypalWebhook,
);
// Backward-compat alias for the URL currently configured in the live Razorpay
// dashboard. Update the dashboard to /webhook/razorpay and remove this in a
// follow-up.
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook,
);

// Proxy routes with raw body passthrough (mounted BEFORE json/urlencoded parsers
// to avoid BadRequestError on deeply nested URL-encoded analytics data)
app.use("/api/proxy", express.raw({ type: "*/*", limit: "10mb" }), proxyRoutes);

// Body parsers for all other routes. Cap at 1mb — large payloads should go
// through dedicated upload endpoints, not generic JSON.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Strip Mongo operator keys ($ and .) from req.body / req.query / req.params,
// and collapse duplicate query params. Mounted AFTER body parsers / BEFORE
// routes so it runs against parsed bodies. The proxy and Razorpay webhook
// were mounted earlier (raw bodies) and bypass these.
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(hpp());

// Global rate-limit floor for everything below. /api/auth and /api/admin get
// stricter tiers when their routes are mounted further down.
app.use(globalLimiter);

// CSRF double-submit verifier for cookie-authed mutating requests. Skipped on
// /api/auth/* (login/signup mints the CSRF token — chicken-and-egg) and on
// requests using Authorization: Bearer (header auth isn't CSRF-able).
const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/validate-email",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/forgot-password",
]);
app.use((req, res, next) => {
  // Only the pre-login auth endpoints are exempt (no session cookie exists yet);
  // signed-in actions under /api/auth (profile, password, account and
  // workspace deletion) are CSRF-protected like everything else.
  if (PUBLIC_AUTH_PATHS.has(req.path) || req.path.startsWith("/api/auth/reset-password/")) return next();
  // Admin panel auth uses Bearer tokens only, never cookies, so CSRF can't apply
  if (req.path.startsWith("/api/admin-auth/")) return next();
  // Guest share-link endpoints use no cookie auth (share token + X-Guest-Access
  // header), so CSRF doesn't apply; the guest client sends no CSRF header.
  if (req.path.startsWith("/api/guest/")) return next();
  // Unsubscribe links are opened from email clients (signed token, no cookie auth)
  if (req.path.startsWith("/api/email/")) return next();
  // Website contact form: public, no session (rate-limited, honeypot)
  if (req.path === "/api/support/contact") return next();
  return verifyCsrf(req, res, next);
});

// Serve uploaded files. Uploads are user-controlled, so never let one render as an
// active document on our origin: no MIME sniffing, and anything other than an image
// or PDF is sandboxed and downloaded instead of displayed.
const INLINE_UPLOAD_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"]);
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, filePath) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    // The app (app.<domain>) shows these from the API host (api.<domain>):
    // allow the same site, not just the same origin (helmet's default).
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (!INLINE_UPLOAD_EXT.has(path.extname(filePath).toLowerCase())) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Content-Disposition", "attachment");
    }
  },
}));

// Screenshot libraries for the review iframe (under /api/ so Nginx forwards to
// Express): html2canvas, and html2canvas-pro as the fallback for pages it can't
// parse (modern CSS colors such as oklch/oklab).
app.use(
  "/api/vendor/pro",
  express.static(path.join(__dirname, "node_modules", "html2canvas-pro", "dist"), { maxAge: "7d" }),
);
app.use(
  "/api/vendor",
  express.static(path.join(__dirname, "node_modules", "html2canvas", "dist"), { maxAge: "7d" }),
);

// Routes — auth gets the credential-burst tier, admin gets its own tier.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", pinRoutes);
app.use("/api/pins", commentRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/email", require("./routes/email.routes"));
app.use("/api/support", require("./routes/support.routes"));
app.use("/api/projects", versionRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/admin-auth", authLimiter, require("./routes/adminAuth.routes"));
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/workspaces", require("./routes/workspace.routes"));
app.get("/api/my-tasks", require("./middleware/auth"), require("./controllers/pin.controller").getMyTasks);

// Health check
app.get("/api/health", async (req, res) => {
  // 503 when MongoDB is unreachable so uptime monitors / load balancers notice.
  // Redis is reported but not fatal: queues/rate limits degrade to memory.
  const dbUp = mongoose.connection.readyState === 1;
  const redisUp = await pingRedis(); // null when Redis isn't configured
  const body = { status: dbUp && redisUp !== false ? "ok" : "degraded", db: dbUp ? "up" : "down" };
  if (redisUp !== null) body.redis = redisUp ? "up" : "down";
  res.status(dbUp ? 200 : 503).json(body);
});

// Public site notice banner endpoint
app.get("/api/site-notice", require("./controllers/siteNotice.controller").getPublicNotice);

// Public plans endpoint — source of truth for billing tab + marketing site.
// No auth: pricing is public.
app.get("/api/plans", async (req, res) => {
  try {
    const { getPlansWithOverrides, getNewSignupPlanMode, getDefaultTrialDaysAsync } = require("./config/plans");
    const { getProviderStatus } = require("./payments");
    const [plans, status, signupMode, trialDays] = await Promise.all([
      getPlansWithOverrides(),
      getProviderStatus(),
      getNewSignupPlanMode(),
      getDefaultTrialDaysAsync(),
    ]);
    const planList = Object.values(plans).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    // signupMode: what a new workspace starts on ('trial' = no card required)
    res.json({ plans, planList, allowDowngrades: !!status.allowDowngrades, signupMode, trialDays });
  } catch (err) {
    res.status(500).json({ message: "Failed to load plans" });
  }
});

// Catch-all: redirect unmatched requests through proxy when a proxy context cookie exists.
// Handles window.location navigations from inside the proxied iframe
// (e.g., after login redirect: window.location.href = '/employee/dashboard').
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const ctxCookie = req.cookies && req.cookies.__markup_proxy_ctx;
  if (!ctxCookie) return next();
  try {
    const { origin, projectId, token, guest } = JSON.parse(ctxCookie);
    if (!origin || !projectId) return next();
    const targetUrl = origin + req.originalUrl;
    let redirectUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token || "")}`;
    if (guest === true) redirectUrl += "&guest=true";
    return res.redirect(307, redirectUrl);
  } catch {
    return next();
  }
});

// Report unexpected (5xx) errors to Sentry before our handler responds
const { Sentry, sentryEnabled } = require("./instrument");
if (sentryEnabled) Sentry.setupExpressErrorHandler(app);

// Error handler
app.use((err, req, res, next) => {
  // Upload validation errors (file too large, too many files) are client errors
  const status = err.name === "MulterError" ? 400 : (err.statusCode || err.status || 500);
  // The request log then includes the error with its stack
  if (status >= 500) res.err = err;
  // Only expose messages for client errors; 5xx details stay in the server log
  res.status(status).json({
    message: status < 500 ? (err.message || "Request failed") : "Internal server error",
  });
});

module.exports = app;
