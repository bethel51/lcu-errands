import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "errand_accepted",
      "errand_requested",
      "errand_completed",
      "errand_delivered",
      "payment_released",
      "wallet_credited",
      "message_received",
      "wallet_topup",
      "account_update",
      "verification_update",
      "withdrawal_update",
      "withdrawal_approved",
      "withdrawal_rejected",
    ],
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // ID of errand, transaction, etc.
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
