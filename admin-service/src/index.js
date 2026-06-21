import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { MonitoringService } from "./utils/MonitoringService.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { seedDefaultAdmin } from "./utils/seeder.js";

const app = express();

// STRICT SECURITY: No public access, only allowed origins (your private admin domain)
app.use(helmet());

// Trust Vercel's reverse proxy so X-Forwarded-For / X-Forwarded-Proto are handled correctly
app.set("trust proxy", 1);

const allowedOrigins = [];
if (process.env.ADMIN_FRONTEND_URL)
  allowedOrigins.push(process.env.ADMIN_FRONTEND_URL);
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173", "http://localhost:5174");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("onrender.com") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ status: "operational", message: "LeadCity Errands Admin Service API is active." });
});

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "operational", service: "leadcity-admin" });
});

app.get("/health/monitor", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await MonitoringService.runHealthCheck();
  res.json({ status: "monitor_executed" });
});

// PRIVATE ROUTES
app.use("/auth", authRoutes);
app.use("/management", adminRoutes);

app.use(errorHandler);

if (!process.env.MONGODB_URI) {
  console.error("❌ FATAL: MONGODB_URI is not defined for Admin Service.");
  process.exit(1);
}

if (!process.env.ADMIN_FRONTEND_URL) {
  console.error("❌ FATAL: ADMIN_FRONTEND_URL is not defined.");
  process.exit(1);
}

if (!process.env.ADMIN_JWT_SECRET) {
  console.error("❌ FATAL: ADMIN_JWT_SECRET is not defined.");
  process.exit(1);
}

if (!process.env.FRONTEND_URL) {
  console.error("❌ FATAL: FRONTEND_URL is not defined.");
  process.exit(1);
}

const PORT = process.env.PORT || process.env.ADMIN_PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// Bind port immediately for Render deployment
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🛡️ Admin Service running on port ${PORT}`);
});

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("🛡️ Admin Service connected to Database");
    await seedDefaultAdmin();
    MonitoringService.start();
  })
  .catch((err) => {
    console.error("❌ Database connection failed", err);
  });

export default app;
