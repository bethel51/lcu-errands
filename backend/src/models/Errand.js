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
    enum: ["open", "accepted", "assigned", "in_progress", "pending_sender_confirmation", "pending_confirmation", "confirmed_completed", "completed", "cancelled"],
    default: "open",
  },
  posterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  erranderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  candidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  isReviewedByPoster: { type: Boolean, default: false },
  isReviewedByErrander: { type: Boolean, default: false },
  completionProof: { type: String }, // Image URL
  completionRequested: { type: Boolean, default: false },
  trackingId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  startedAt: { type: Date },
  messengerCompletedAt: { type: Date },
  senderConfirmedAt: { type: Date },
  paymentReleased: { type: Boolean, default: false },
  paymentReleasedAt: { type: Date },
  paymentTransactionId: { type: String },
  autoReleased: { type: Boolean, default: false }, // true = released by 45min system timer
  hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // users who removed from their history
});

errandSchema.pre("save", function () {
  if (!this.trackingId) {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.trackingId = `ERR-${random}`;
  }
});

// Single-field indexes
errandSchema.index({ category: 1 });
// Compound indexes for most common query patterns
errandSchema.index({ status: 1, createdAt: -1 });   // open errand feed
errandSchema.index({ posterId: 1, status: 1 });      // sender history & active requests
errandSchema.index({ erranderId: 1, status: 1 });    // messenger history & active errands
errandSchema.index({ posterId: 1, createdAt: -1 });  // sender history sorted
errandSchema.index({ erranderId: 1, createdAt: -1 }); // messenger history sorted
errandSchema.index({ status: 1, messengerCompletedAt: 1 }); // auto-release cron query

export const Errand = mongoose.model("Errand", errandSchema);
