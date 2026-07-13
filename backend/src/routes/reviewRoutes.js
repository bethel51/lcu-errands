import express from "express";
import {
  createReview,
  getReviewsForUser,
  getMyReviews,
} from "../controllers/reviewController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createReview);
router.get("/me", authMiddleware, getMyReviews);
router.get("/user/:userId", getReviewsForUser);

export default router;
