require("dotenv").config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const proxyRoutes = require('./routes/proxy.routes');
const auth = require('./middleware/auth');
const { upstreamAgent } = require('./controllers/proxy.controller');
const { deleteCache, clearCache } = require('./utils/redisCache');
const { scheduleCacheWatcher, startCacheWorker } = require('./workers/cacheWatcher');

const app = express();
app.set('trust proxy', 1);

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

app.use('/api/proxy', proxyRoutes);

// Cache invalidation endpoint — used by the Sync button
app.delete('/api/proxy/cache', auth, async (req, res) => {
  try {
    const { url, projectId } = req.query;
    if (url && projectId) {
      await deleteCache(url + '|' + projectId);
    } else {
      await clearCache();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Cache clear failed', error: err.message });
  }
});

// Catch-all: redirect unmatched requests through proxy when a proxy context cookie exists.
// Handles window.location navigations from inside the proxied iframe.
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PROXY_PORT || 5000;

connectDB()
  .then(() => {
    // Start BullMQ cache watcher (checks upstream pages for changes every 60s)
    scheduleCacheWatcher().catch((err) => console.error('Failed to schedule cache watcher:', err.message));
    startCacheWorker(upstreamAgent);

    app.listen(PORT, () => {
      console.log(`Proxy server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
