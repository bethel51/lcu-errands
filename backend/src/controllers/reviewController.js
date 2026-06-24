import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { catchAsync } from "./catchAsync.js";

export const createReview = catchAsync(async (req, res) => {
  const { errandId, rating, comment } = req.body;
  const reviewerId = req.user.id;

  const errand = await Errand.findById(errandId);
  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  if (!["completed", "confirmed_completed"].includes(errand.status)) {
    res.status(400).json({ message: "You can only review completed errands" });
    return;
  }

  // Determine who is being reviewed (if reviewer is poster, reviewee is errander, and vice versa)
  let revieweeId;
  if (errand.posterId.toString() === reviewerId) {
    revieweeId = errand.erranderId;
  } else if (errand.erranderId?.toString() === reviewerId) {
    revieweeId = errand.posterId;
  } else {
    res.status(403).json({ message: "You are not part of this errand" });
    return;
  }

  if (!revieweeId) {
    res.status(400).json({ message: "No reviewee found for this errand" });
    return;
  }

  const newReview = new Review({
    errandId,
    reviewerId,
    revieweeId,
    rating,
    comment,
  });

  await newReview.save();

  // Update Errand review flag
  if (errand.posterId.toString() === reviewerId) {
    await Errand.findByIdAndUpdate(errandId, { isReviewedByPoster: true });
  } else {
    await Errand.findByIdAndUpdate(errandId, { isReviewedByErrander: true });
  }

  // Update User's average rating
  const reviews = await Review.find({ revieweeId: revieweeId.toString() });
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 0;

  await User.findByIdAndUpdate(revieweeId, { rating: averageRating });

  res.status(201).json(newReview);
});

export const getReviewsForUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const reviews = await Review.find({ revieweeId: userId })
    .populate("reviewerId", "name profilePicture")
    .sort({ createdAt: -1 });

  res.json(reviews);
});
