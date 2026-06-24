import mongoose from "mongoose";

const footprintLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // "POSTED", "EDITED", "ACCEPTED", "STARTED", "PROOF_UPLOADED", "COMPLETED", "REVIEWED", "CONFIRMED", "RELEASED", "ADMIN_INTERVENED", "ADMIN_CANCELLED", "ADMIN_DISPUTE_RESOLVED"
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorName: String,
  actorRole: String, // "sender", "messenger", "admin"
  actionTitle: String,
  actionDescription: String,
  ipAddress: String,
  deviceInfo: String,
  details: String,
  metadata: mongoose.Schema.Types.Mixed
});

const digitalFootprintSchema = new mongoose.Schema({
  errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand", required: true, unique: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  messengerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timePosted: { type: Date, default: Date.now },
  timeAccepted: Date,
  timeCompleted: Date,
  timeConfirmed: Date,
  deviceInfo: {
    posted: String,
    accepted: String,
    completed: String,
    confirmed: String
  },
  ipAddress: {
    posted: String,
    accepted: String,
    completed: String,
    confirmed: String
  },
  locationData: {
    posted: String,
    accepted: String,
    completed: String,
    confirmed: String
  },
  transactionReference: String,
  walletMovementLogs: [
    {
      timestamp: { type: Date, default: Date.now },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: String, // "DEBIT_ESCROW", "CREDIT_WALLET", "FREEZE_FUNDS", "RELEASE_FUNDS"
      amount: Number,
      previousBalance: Number,
      newBalance: Number
    }
  ],
  status: {
    type: String,
    enum: ["held", "released", "frozen", "rejected"],
    default: "held"
  },
  isSuspicious: { type: Boolean, default: false },
  auditTrail: [footprintLogSchema]
}, { timestamps: true });

export const DigitalFootprint = mongoose.model("DigitalFootprint", digitalFootprintSchema);
