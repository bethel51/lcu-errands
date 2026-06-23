import mongoose from "mongoose";

const footprintLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // "POSTED", "ACCEPTED", "COMPLETED", "CONFIRMED", "APPROVED", "REJECTED", "FLAGGED", "FROZEN", "RELEASED"
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ipAddress: String,
  deviceInfo: String,
  details: String
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
