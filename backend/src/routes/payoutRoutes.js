import express from "express";
import {
  requestWithdrawal,
  getMyWithdrawals,
} from "../controllers/withdrawalController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Messenger routes
router.post("/request", authMiddleware, requestWithdrawal);
router.get("/my", authMiddleware, getMyWithdrawals);

export default router;
