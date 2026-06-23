import mongoose from "mongoose";

const errandSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  fee: { type: Number, required: true },
  status: {
    type: String,
    enum: ["open", "assigned", "in_progress", "pending_confirmation", "completed", "cancelled"],
    default: "open",
  },
  posterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  erranderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isReviewedByPoster: { type: Boolean, default: false },
  isReviewedByErrander: { type: Boolean, default: false },
  completionProof: { type: String }, // Image URL
  createdAt: { type: Date, default: Date.now },
});

errandSchema.index({ status: 1 });
errandSchema.index({ posterId: 1 });
errandSchema.index({ erranderId: 1 });
errandSchema.index({ category: 1 });
errandSchema.index({ createdAt: -1 });

export const Errand = mongoose.model("Errand", errandSchema);
