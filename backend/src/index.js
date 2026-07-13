import "dotenv/config";

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

import notificationRoutes from "./routes/notificationRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

import { User } from "./models/User.js";
import { Notification } from "./models/Notification.js";
import { Errand } from "./models/Errand.js";
import { Transaction } from "./models/Transaction.js";
import { DigitalFootprint } from "./models/DigitalFootprint.js";
import cron from "node-cron";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://leadcityerrands-frontend.vercel.app",
  "https://leadcityerrands-wt32.onrender.com",
  "https://bethel123-afk.github.io",
].filter(Boolean);

const app = express();
app.set("trust proxy", 1);
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

// Serve uploaded files statically
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), { maxAge: "30d" }),
);

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

// ===== AUTO-RELEASE ESCROW LOGIC (45 min timer) =====
const AUTO_RELEASE_MINUTES = 45;

const autoReleaseStalePendingErrands = async () => {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_MINUTES * 60 * 1000);
  const staleErrands = await Errand.find({
    status: "pending_sender_confirmation",
    messengerCompletedAt: { $lte: cutoff },
    paymentReleased: { $ne: true },
  });

  if (staleErrands.length === 0) return { released: 0, total: 0 };

  let released = 0;
  for (const errand of staleErrands) {
    const session = null; // No-op: standalone MongoDB doesn't support transactions
    try {
      const errander = await User.findById(errand.erranderId);
      if (!errander) continue;

      const previousBalance = errander.balance;
      errander.balance += errand.fee;
      await errander.save();

      const tx = await Transaction.create({
        userId: errander._id,
        amount: errand.fee,
        type: "errand_earning",
        description: `Auto-released payment for errand: ${errand.title}`,
        errandId: errand._id,
        senderId: errand.posterId,
        messengerId: errander._id,
        status: "completed",
      });

      errand.status = "confirmed_completed";
      errand.paymentReleased = true;
      errand.paymentReleasedAt = new Date();
      errand.paymentTransactionId = tx._id.toString();
      errand.autoReleased = true;
      await errand.save();

      await DigitalFootprint.findOneAndUpdate(
        { errandId: errand._id },
        {
          $set: { status: "released", timeConfirmed: new Date(), transactionReference: `AUTO-TX-${tx._id}` },
          $push: {
            auditTrail: {
              action: "AUTO_RELEASED",
              timestamp: new Date(),
              actorName: "System",
              actorRole: "system",
              actionTitle: "Auto-Released ⏱️",
              actionDescription: `Sender did not confirm within ${AUTO_RELEASE_MINUTES} minutes. ₦${errand.fee} auto-released to messenger wallet.`,
              details: "Payment auto-released by system timeout.",
            },
            walletMovementLogs: {
              timestamp: new Date(),
              userId: errander._id,
              action: "AUTO_CREDIT_WALLET",
              amount: errand.fee,
              previousBalance,
              newBalance: errander.balance,
            },
          },
        }
      );

      released++;

      // Notify both parties
      const notifications = [
        {
          userId: errand.posterId.toString(),
          title: "Payment Auto-Released ⏱️",
          message: `You didn't confirm "${errand.title}" within ${AUTO_RELEASE_MINUTES} mins. Funds were automatically released to the messenger.`,
          type: "payment_released",
          relatedId: errand._id.toString(),
        },
        {
          userId: errander._id.toString(),
          title: "Wallet Credited! 💰",
          message: `Your payment for "${errand.title}" was auto-released to your wallet.`,
          type: "wallet_credited",
          relatedId: errand._id.toString(),
        },
      ];
      await Notification.insertMany(notifications);
      notifications.forEach((n) => io.to(n.userId).emit("notification", n));
      io.to("admin").emit("errand_auto_released", { errandId: errand._id, fee: errand.fee, messenger: errander.name });

      console.log(`[AutoRelease] ✅ Errand ${errand._id} (₦${errand.fee}) auto-released to ${errander.name}`);
    } catch (err) {
      console.error(`[AutoRelease] ❌ Failed for errand ${errand._id}:`, err.message);
    }
  }

  return { released, total: staleErrands.length };
};

// HTTP endpoint for manual trigger / external cron service
app.get("/api/cron/auto-release", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await autoReleaseStalePendingErrands();
    console.log(`[AutoRelease] HTTP trigger: ${result.released}/${result.total} released`);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[AutoRelease] HTTP trigger error:", err);
    res.status(500).json({ error: "Auto-release failed" });
  }
});

// Scheduled auto-release: runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    const result = await autoReleaseStalePendingErrands();
    if (result.released > 0) {
      console.log(`[AutoRelease] Cron: ${result.released} errand(s) auto-released`);
    }
  } catch (err) {
    console.error("[AutoRelease] Cron error:", err.message);
  }
});
// ===================================================

// Global Error Handler (Must be at the end, after all routes)
app.use(errorHandler);

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

// Socket.io for Real-time Notifications & Online Status
const onlineUsers = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", async (userId) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.warn(`[Socket] Invalid or missing userId passed to join: ${userId}`);
        return;
      }
      socket.join(userId);
      onlineUsers.set(socket.id, userId);

      // Update DB
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Broadcast status change
      io.emit("user_status_change", { userId, isOnline: true });
      console.log(
        `User ${socket.id} (ID: ${userId}) joined personal room and is now ONLINE`,
      );
    } catch (err) {
      console.error("[Socket] Error in join handler:", err);
    }
  });

  // Admin portal room — allows admin frontend to receive admin-targeted events
  socket.on("join_admin", (secret) => {
    if (secret === process.env.CRON_SECRET) {
      socket.join("admin");
      console.log(`[Socket] Admin portal joined admin room (${socket.id})`);
    }
  });

  socket.on("disconnect", async () => {
    try {
      const userId = onlineUsers.get(socket.id);
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        // Check if user has other active connections before marking offline
        const userSockets = await io.in(userId).fetchSockets();
        if (userSockets.length === 0) {
          await User.findByIdAndUpdate(userId, { isOnline: false });
          io.emit("user_status_change", { userId, isOnline: false });
          console.log(`User ${userId} is now OFFLINE`);
        }
        onlineUsers.delete(socket.id);
      }
    } catch (err) {
      console.error("[Socket] Error in disconnect handler:", err);
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

    // Cross-service real-time notification sync via MongoDB Change Streams
    try {
      const notificationChangeStream = mongoose.connection.collection("notifications").watch();
      notificationChangeStream.on("change", async (change) => {
        if (change.operationType === "insert") {
          const fullDocument = change.fullDocument;
          if (fullDocument && fullDocument.userId) {
            io.to(fullDocument.userId.toString()).emit("notification", fullDocument);
          }
        }
      });
      notificationChangeStream.on("error", (err) => {
        console.error("❌ Change Stream error:", err);
      });
      notificationChangeStream.on("close", () => {
        console.warn("⚠️ Change Stream closed.");
      });
      console.log("📡 Cross-service real-time notifications via Change Stream active");
    } catch (err) {
      console.error("❌ Failed to start Change Stream listener:", err);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// NOTE: The primary error handler is registered above (after routes).
// This secondary handler is intentionally removed to avoid duplicate responses.


// Export app for Vercel serverless functions
export default app;
