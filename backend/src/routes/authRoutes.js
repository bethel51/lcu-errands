import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtpAndRegister,
  resendOtp,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtpAndRegister);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
