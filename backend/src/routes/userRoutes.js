import { Router } from "express";
import {
  updateProfile,
  getProfile,
  topUp,
  getTransactions,
  uploadProfilePicture,
  uploadFile,
  handlePaystackWebhook,
  getMessengers,
  boostProfile,
  deleteAccount,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/messengers", getMessengers);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.delete("/profile", authMiddleware, deleteAccount);
router.post("/top-up", authMiddleware, topUp);
router.post("/boost-profile", authMiddleware, boostProfile);
// Verification route removed as requested
router.get("/transactions", authMiddleware, getTransactions);
router.post(
  "/profile-picture",
  authMiddleware,
  uploadImage("profiles", "profilePicture"),
  uploadProfilePicture,
);
router.post(
  "/upload",
  authMiddleware,
  uploadImage("general", "image"),
  uploadFile,
);
router.post("/paystack/webhook", handlePaystackWebhook);

export default router;
