import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  adminName: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: String },
  targetName: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Log = mongoose.model("Log", logSchema);
