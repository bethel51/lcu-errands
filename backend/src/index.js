import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import errandRoutes from "./routes/errandRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { Message } from "./models/Message.js";
import { User } from "./models/User.js";
import { Notification } from "./models/Notification.js";
import { Errand } from "./models/Errand.js";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://leadcityerrands-frontend.vercel.app",
  "https://leadcityerrands-frontend.onrender.com",
  "https://bethel123-afk.github.io",
].filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://api.paystack.co",
          process.env.FRONTEND_URL,
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to accommodate simultaneous requests from the admin portal
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", apiLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 auth attempts per hour per IP (allows ~16 full sign-up+login cycles)
  message: "Too many authentication attempts, please try again after an hour",
  skip: (req) => req.path === "/verify-otp", // OTP verify has its own protection
});
app.use("/api/auth", authLimiter);

const errandCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 errands per hour
  message: "Errand creation limit reached. Please try again later.",
});
app.use("/api/errands/create", errandCreationLimiter);

// Attach socket.io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", serverTime: new Date() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/errands", errandRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/withdrawals", payoutRoutes);
app.use("/api/debug", debugRoutes);

// Vercel Cron Job Route for Boost Cleanup
app.get("/api/cron/cleanup", async (req, res) => {
  // Simple auth to prevent abuse
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const now = new Date();
    await User.updateMany(
      { isBoosted: true, boostUntil: { $lt: now } },
      { $set: { isBoosted: false } },
    );
    console.log("Expired boosts cleaned up");
    res.json({ success: true });
  } catch (err) {
    console.error("Boost cleanup cron error:", err);
    res.status(500).json({ error: "Failed to clean up boosts" });
  }
});

// Global Error Handler (Must be at the end)
app.use(errorHandler);

// Serve uploaded files statically
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), { maxAge: "30d" }),
);

// Root welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to LeadCity Errands API!",
    status: "active",
    version: "1.0.0"
  });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "API Endpoint not found" });
});



// Socket.io for Real-time chat & Online Status
const onlineUsers = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (errandId) => {
    socket.join(errandId);
    console.log(`User ${socket.id} joined errand room ${errandId}`);
  });

  socket.on("join", async (userId) => {
    socket.join(userId);
    onlineUsers.set(socket.id, userId);

    // Update DB
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Broadcast status change
    io.emit("user_status_change", { userId, isOnline: true });
    console.log(
      `User ${socket.id} (ID: ${userId}) joined personal room and is now ONLINE`,
    );
  });

  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        errandId: data.room,
        senderId: data.senderId,
        text: data.text,
        imageUrl: data.imageUrl,
      });
      await newMessage.save();

      io.to(data.room).emit("receive_message", {
        ...data,
        imageUrl: data.imageUrl,
        createdAt: newMessage.createdAt,
      });

      // Find the other person in the errand to notify them
      const errand = await Errand.findById(data.room);
      if (errand) {
        const recipientId =
          errand.posterId.toString() === data.senderId
            ? errand.erranderId
            : errand.posterId;
        if (recipientId) {
          const notificationData = {
            userId: recipientId,
            title: "New Message",
            message: `You have a new message on errand: ${errand.title}`,
            type: "message_received",
            relatedId: errand._id,
          };
          await Notification.create(notificationData);
          io.to(recipientId.toString()).emit("notification", notificationData);
        }
      }
    } catch (error) {
      console.error("Socket error saving message:", error);
    }
  });

  socket.on("disconnect", async () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      // Check if user has other active connections before marking offline
      const userSockets = await io.in(userId).fetchSockets();
      if (userSockets.length === 0) {
        await User.findByIdAndUpdate(userId, { isOnline: false });
        io.emit("user_status_change", { userId, isOnline: false });
        console.log(`User ${userId} is now OFFLINE`);
      }
      onlineUsers.delete(socket.id);
    }
    console.log("User disconnected:", socket.id);
  });
});

// Cron Job: Runs every hour to check system health
app.get("/api/cron/health", (req, res) => {
  console.log("--- Hourly System Check ---");
  console.log("Time:", new Date().toLocaleString());
  console.log("Status: All systems operational");
  console.log("---------------------------");
  res.json({ status: "ok" });
});

if (!process.env.FRONTEND_URL) {
  console.error(
    "❌ FATAL: FRONTEND_URL is not defined in environment variables.",
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error(
    "❌ FATAL: MONGODB_URI is not defined in environment variables.",
  );
  process.exit(1);
}

if (!JWT_SECRET || JWT_SECRET === "supersecret_change_me_in_production") {
  console.error(
    "❌ FATAL: JWT_SECRET is not defined or is set to a vulnerable default.",
  );
  process.exit(1);
}

if (!process.env.ADMIN_JWT_SECRET) {
  console.warn(
    "⚠️ WARNING: ADMIN_JWT_SECRET is not defined. Falling back to JWT_SECRET.",
  );
}

// Listen on all network interfaces for Render deployment
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 500, // Extreme scale for 100k+ users
    minPoolSize: 10, // Keep connections warm for instant response
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Export app for Vercel serverless functions
export default app;
