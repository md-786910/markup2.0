const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const pinRoutes = require('./routes/pin.routes');
const commentRoutes = require('./routes/comment.routes');
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
app.use('/api/invitations', invitationRoutes);

// --- Bull Board dashboard (BullMQ job monitoring) ---
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const cacheCheckQueue = new Queue('cache-check', { connection: redisConnection });

const bullServerAdapter = new ExpressAdapter();
bullServerAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(cacheCheckQueue)],
  serverAdapter: bullServerAdapter,
});
app.use('/admin/queues', bullServerAdapter.getRouter());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
