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
  requestVerificationOtp,
  confirmVerificationOtp,
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
// Two-step messenger verification: matric number check → OTP → verified badge
router.post("/verify/request", authMiddleware, requestVerificationOtp);
router.post("/verify/confirm", authMiddleware, confirmVerificationOtp);
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
