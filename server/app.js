const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const pinRoutes = require('./routes/pin.routes');
const commentRoutes = require('./routes/comment.routes');
const proxyRoutes = require('./routes/proxy.routes');
const invitationRoutes = require('./routes/invitation.routes');

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, frameguard: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', pinRoutes);
app.use('/api/pins', commentRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/invitations', invitationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all: redirect unmatched requests through proxy when a proxy context cookie exists.
// Handles window.location navigations from inside the proxied iframe
// (e.g., after login redirect: window.location.href = '/employee/dashboard').
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const ctxCookie = req.cookies && req.cookies.__markup_proxy_ctx;
  if (!ctxCookie) return next();
  try {
    const { origin, projectId, token } = JSON.parse(ctxCookie);
    if (!origin || !projectId) return next();
    const targetUrl = origin + req.originalUrl;
    return res.redirect(307, `/api/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token || '')}`);
  } catch {
    return next();
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
