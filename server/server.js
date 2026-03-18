require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const app = require("./app");
const User = require("./models/User");

const PORT = process.env.PORT || 5000;

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

    // Connection handler — room management
    io.on("connection", (socket) => {
      socket.on("join:project", (projectId) => {
        socket.join(`project:${projectId}`);
      });

      socket.on("leave:project", (projectId) => {
        socket.leave(`project:${projectId}`);
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
