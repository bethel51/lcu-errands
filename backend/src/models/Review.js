import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  errandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Errand",
    required: true,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: { type: Number, required: true, min: 1, max: 4 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Ensure a user can only review an errand once
reviewSchema.index({ errandId: 1, reviewerId: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);
