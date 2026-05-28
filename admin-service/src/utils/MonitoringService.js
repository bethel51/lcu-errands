import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { Log } from "../models/Log.js";
import { sendBroadcastEmail } from "../utils/mailService.js";
import mongoose from "mongoose";

export class MonitoringService {
  static start() {
    console.log("🩺 System Health Monitor Started");
    this.interval = setInterval(() => this.runHealthCheck(), 1000 * 60 * 15); // Run every 15 minutes
  }

  static async runHealthCheck() {
    try {
      const issues = [];

      // 1. Database Connectivity
      if (mongoose.connection.readyState !== 1) {
        issues.push("CRITICAL: Database disconnected or unstable");
      }

      // 2. Resource Usage
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      if (memoryUsage > 400) {
        // If using more than 400MB
        issues.push(
          `WARNING: High memory usage (${memoryUsage.toFixed(2)} MB)`,
        );
      }

      // 3. Platform Stagnation Check
      const hourAgo = new Date(Date.now() - 1000 * 60 * 60);
      const recentErrands = await Errand.countDocuments({
        createdAt: { $gte: hourAgo },
      });
      // If we usually have traffic and suddenly have 0 for an hour, it might be a login/posting issue
      if (recentErrands === 0) {
        const totalUsers = await User.countDocuments();
        if (totalUsers > 10) {
          // Only alert if we have enough users to expect traffic
          // issues.push('INFO: Zero errand activity in the last 60 minutes');
        }
      }
      if (issues.length > 0) {
        console.log("⚠️ Health Monitor detected issues:", issues);
        // Email Alert if Critical
        if (issues.some((i) => i.includes("CRITICAL"))) {
          try {
            await sendBroadcastEmail(
              "admin@lcu.edu.ng",
              "Admin",
              "CRITICAL SYSTEM ALERT",
              `Infrastructure Health Monitor has detected critical issues:\n\n${issues.join("\n")}`,
            );
          } catch (emailErr) {
            console.error("Failed to send critical health email", emailErr);
          }
        }

        // Log to DB (might fail if DB is the issue)
        try {
          await Log.create({
            adminId: "SYSTEM",
            adminName: "Health Monitor",
            action: "HEALTH_ALERT",
            targetName: "Infrastructure",
            details: issues.join(" | "),
          });
        } catch (dbErr) {
          console.error("Failed to log health issue to DB", dbErr);
        }
      }
    } catch (error) {
      console.error("Monitoring failed", error);
    }
  }

  static stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
