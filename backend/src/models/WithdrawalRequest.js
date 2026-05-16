import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  accountNumber: { type: String, required: true },
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

export const WithdrawalRequest = mongoose.model(
  "WithdrawalRequest",
  withdrawalRequestSchema,
);
