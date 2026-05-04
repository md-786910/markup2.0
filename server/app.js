const express = require("express");
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

const {
  authLimiter,
  adminLimiter,
  globalLimiter,
} = require("./middleware/rateLimiters");
const { verifyCsrf } = require("./middleware/csrf");

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

// Middleware
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  }),
);
// CORS allowlist: env-driven (ALLOWED_ORIGINS=comma,separated,list) with a
// hardcoded fallback for the known prod hosts. Localhost matches in dev only.
const FALLBACK_ORIGINS = [
  process.env.CLIENT_ORIGIN || "http://localhost:3000",
  process.env.ADMIN_ORIGIN || "http://localhost:3001",
  process.env.WEBSITE_ORIGIN || "http://localhost:3002",
  "https://app.feedbackly.online",
  "https://markupadmin.vercel.app",
  "https://admin.feedbackly.online",
  "https://feedbackly.online",
  "https://www.feedbackly.online",
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : FALLBACK_ORIGINS;
const LOCALHOST_RE = /^https?:\/\/localhost(:\d+)?$/;

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      if (process.env.NODE_ENV !== "production" && LOCALHOST_RE.test(origin))
        return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth/")) return next();
  return verifyCsrf(req, res, next);
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve html2canvas for iframe screenshot capture (under /api/ so Nginx forwards to Express)
app.use(
  "/api/vendor",
  express.static(path.join(__dirname, "node_modules", "html2canvas", "dist")),
);

// Routes — auth gets the credential-burst tier, admin gets its own tier.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", pinRoutes);
app.use("/api/pins", commentRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/projects", versionRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public plans endpoint — source of truth for billing tab + marketing site.
// No auth: pricing is public.
app.get("/api/plans", async (req, res) => {
  try {
    const { getPlansWithOverrides } = require("./config/plans");
    const plans = await getPlansWithOverrides();
    const planList = Object.values(plans).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    res.json({ plans, planList });
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

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
