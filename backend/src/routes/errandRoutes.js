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
  requestCompletion,
  startErrand,
  uploadProof,
  getErrandFootprint,
} from "../controllers/errandController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getErrands);
router.get("/history", authMiddleware, getUserHistory);
router.get("/:id", getErrandById);
router.get("/:id/footprint", authMiddleware, getErrandFootprint);

// Protected routes
router.post("/", authMiddleware, createErrand);
router.post("/inquiry", authMiddleware, createInquiry);
router.patch("/:id/accept", authMiddleware, acceptErrand);
router.patch("/:id/start", authMiddleware, startErrand);
router.patch("/:id/upload-proof", authMiddleware, uploadProof);
router.patch("/:id/complete", authMiddleware, completeErrand);
router.patch("/:id/request-completion", authMiddleware, requestCompletion);
router.delete("/:id", authMiddleware, deleteErrand);

export default router;
