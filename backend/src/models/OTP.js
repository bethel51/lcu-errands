import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 3600, // Safe database TTL of 1 hour to avoid any clock skew / timezone mismatch deletions
  },
  formData: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Drop the old TTL index on startup so MongoDB can recreate it with the safe 1-hour expiration
mongoose.connection.once("open", async () => {
  try {
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections({ name: "otps" }).toArray();
      if (collections.length > 0) {
        await db.collection("otps").dropIndex("expiresAt_1").catch(() => {});
        console.log("🔄 Rebuilt OTP collection indexes with safe TTL.");
      }
    }
  } catch (err) {
    console.error("⚠️ OTP Index Rebuild Error:", err);
  }
});

export const OTP = mongoose.model("OTP", otpSchema);

