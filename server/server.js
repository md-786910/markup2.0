require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const app = require("./app");
const User = require("./models/User");

const PORT = process.env.API_PORT || 5001;

connectDB()
  .then(() => {
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Socket.IO JWT authentication middleware
    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("name email");
        if (!user) return next(new Error("User not found"));
        socket.user = user;
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    // Connection handler — room management + presence tracking
    io.on("connection", (socket) => {
      socket.on("join:project", (projectId) => {
        socket.join(`project:${projectId}`);
        socket.data.projectId = projectId;

        // Broadcast to others that this user is online
        socket.to(`project:${projectId}`).emit("presence:joined", {
          userId: socket.user._id.toString(),
          name: socket.user.name,
        });

        // Send current online user list to the newly joined user
        const room = io.sockets.adapter.rooms.get(`project:${projectId}`);
        if (room) {
          const onlineUserIds = [];
          for (const sid of room) {
            const s = io.sockets.sockets.get(sid);
            if (s?.user?._id) onlineUserIds.push(s.user._id.toString());
          }
          socket.emit("presence:online", { userIds: onlineUserIds });
        }
      });

      socket.on("leave:project", (projectId) => {
        socket.leave(`project:${projectId}`);
        const now = new Date();
        User.findByIdAndUpdate(socket.user._id, { lastSeen: now }).catch(() => {});
        socket.to(`project:${projectId}`).emit("presence:left", {
          userId: socket.user._id.toString(),
          lastSeen: now.toISOString(),
        });
      });

      socket.on("disconnect", () => {
        const projectId = socket.data.projectId;
        if (projectId) {
          const now = new Date();
          User.findByIdAndUpdate(socket.user._id, { lastSeen: now }).catch(() => {});
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
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
