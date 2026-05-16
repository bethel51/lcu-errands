import express from "express";
import {
  createErrand,
  getErrands,
  getErrandById,
  acceptErrand,
  getUserHistory,
  completeErrand,
  deleteErrand,
  createInquiry,
} from "../controllers/errandController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getErrands);
router.get("/history", authMiddleware, getUserHistory);
router.get("/:id", getErrandById);

// Protected routes
router.post("/", authMiddleware, createErrand);
router.post("/inquiry", authMiddleware, createInquiry);
router.put("/:id/accept", authMiddleware, acceptErrand);
router.put("/:id/complete", authMiddleware, completeErrand);
router.delete("/:id", authMiddleware, deleteErrand);

export default router;
