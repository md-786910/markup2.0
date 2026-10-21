require("./config/env");

// Multi-core: the primary process only supervises the workers (utils/cluster.js)
if (require("./utils/cluster").startClusterIfEnabled()) return;

// Sentry must load before everything else so it can instrument Express/HTTP/MongoDB
const { Sentry } = require("./instrument");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const app = require("./app");
const User = require("./models/User");
const Project = require("./models/Project");
const mongoose = require("mongoose");
const { resolveAccess } = require("./middleware/projectAccess");
const { isProxyToken } = require("./utils/proxyToken");
const { flushAll, startEmailWorker } = require("./utils/emailQueue");
const { redisEnabled, createConnection, closeRedis } = require("./utils/redis");
const { startBillingScheduler, stopBillingScheduler } = require("./utils/scheduler");
const { ALLOWED_ORIGINS } = require("./config/env");

// Log instead of dying silently; a crash after an uncaught exception is intended
// (state may be corrupt) so the process manager restarts it.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  Sentry.captureException(reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  Sentry.captureException(err);
  Sentry.close(2000).finally(() => process.exit(1));
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Long-polling needs every request of a client on the same process, which
      // multiple workers can't guarantee: WebSocket only when clustered.
      ...(process.env.CLUSTER_WORKERS ? { transports: ["websocket"] } : {}),
    });

    // Multi-instance: fan socket.io events out through Redis so users connected
    // to different API instances see each other's pins, comments and presence.
    if (redisEnabled) {
      const { createAdapter } = require("@socket.io/redis-adapter");
      io.adapter(createAdapter(createConnection("socket-pub"), createConnection("socket-sub")));
    }

    // Socket.IO JWT authentication middleware
    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ["HS256"],
        });
        if (isProxyToken(decoded)) return next(new Error("Invalid token"));
        const user = await User.findById(decoded.id).select("name email role organization sessionToken");
        if (!user) return next(new Error("User not found"));
        // Single-session enforcement, same as the HTTP auth middleware
        if (decoded.sessionToken && user.sessionToken && decoded.sessionToken !== user.sessionToken) {
          return next(new Error("Session expired"));
        }
        socket.user = user;
        // socket.data is visible to other instances (fetchSockets via the Redis adapter)
        socket.data.userId = user._id.toString();
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    // Connection handler — room management + presence tracking
    io.on("connection", (socket) => {
      // Auto-join personal user room for targeted notifications
      if (socket.user?._id) {
        socket.join(`user:${socket.user._id.toString()}`);
      }

      socket.on("join:project", async (projectId) => {
        // Only project members (or admins of the project's org) may join its room
        try {
          if (!mongoose.isValidObjectId(projectId)) return;
          const project = await Project.findById(projectId).select("owner members organization");
          if (!project || !resolveAccess(socket.user, project).allowed) return;
        } catch {
          return;
        }
        socket.join(`project:${projectId}`);
        socket.data.projectId = projectId;

        // Broadcast to others that this user is online
        socket.to(`project:${projectId}`).emit("presence:joined", {
          userId: socket.user._id.toString(),
          name: socket.user.name,
        });

        // Send current online user list to the newly joined user (all instances)
        try {
          const sockets = await io.in(`project:${projectId}`).fetchSockets();
          const onlineUserIds = [...new Set(sockets.map((s) => s.data.userId).filter(Boolean))];
          socket.emit("presence:online", { userIds: onlineUserIds });
        } catch (err) {
          console.error("presence lookup failed:", err.message);
        }
      });

      socket.on("leave:project", (projectId) => {
        socket.leave(`project:${projectId}`);
        const now = new Date();
        User.findByIdAndUpdate(socket.user._id, { lastSeen: now }).catch(
          () => {},
        );
        socket.to(`project:${projectId}`).emit("presence:left", {
          userId: socket.user._id.toString(),
          lastSeen: now.toISOString(),
        });
      });

      socket.on("disconnect", () => {
        const projectId = socket.data.projectId;
        if (projectId) {
          const now = new Date();
          User.findByIdAndUpdate(socket.user._id, { lastSeen: now }).catch(
            () => {},
          );
          socket.to(`project:${projectId}`).emit("presence:left", {
            userId: socket.user._id.toString(),
            lastSeen: now.toISOString(),
          });
        }
      });
    });

    // Make io accessible to controllers via req.app.get('io')
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Background jobs: email batches (Redis only) and daily billing/trials
    startEmailWorker();
    startBillingScheduler().catch((err) => console.error("[billing] scheduler failed to start:", err));

    // Graceful shutdown: stop accepting connections, send queued emails, close DB.
    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received, shutting down...`);
      setTimeout(() => process.exit(1), 10000).unref();
      try {
        io.close();
        await new Promise((resolve) => server.close(resolve));
        await flushAll();
        await stopBillingScheduler();
        await closeRedis();
        await mongoose.disconnect();
        await Sentry.close(2000);
      } catch (err) {
        console.error("Error during shutdown:", err);
      }
      process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
