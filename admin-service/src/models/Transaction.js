import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  description: { type: String, required: true },
  errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand" },
  createdAt: { type: Date, default: Date.now },
});

transactionSchema.index({ userId: 1 });
transactionSchema.index({ createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
