import express from "express";
import {
  createErrand,
  getErrands,
  getErrandById,
  applyForErrand,
  selectMessenger,
  getUserHistory,
  deleteFromHistory,
  completeErrand,
  deleteErrand,
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
router.patch("/:id/apply", authMiddleware, applyForErrand);
router.post("/:id/select", authMiddleware, selectMessenger);
router.patch("/:id/start", authMiddleware, startErrand);
router.patch("/:id/upload-proof", authMiddleware, uploadProof);
router.patch("/:id/complete", authMiddleware, completeErrand);
router.patch("/:id/request-completion", authMiddleware, requestCompletion);
router.delete("/:id/history", authMiddleware, deleteFromHistory); // Remove from history
router.delete("/:id", authMiddleware, deleteErrand);

export default router;
