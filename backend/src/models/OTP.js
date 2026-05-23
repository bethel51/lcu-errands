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

// NOTE: TTL index is managed by Mongoose automatically via the `expires` option above.
// Do NOT drop/rebuild indexes on every restart — it causes a cleanup gap window.

export const OTP = mongoose.model("OTP", otpSchema);

