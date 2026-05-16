import express from "express";
import {
  getMessagesForErrand,
  getUserConversations,
} from "../controllers/chatController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/conversations", authMiddleware, getUserConversations);
router.get("/:errandId", authMiddleware, getMessagesForErrand);

export default router;
