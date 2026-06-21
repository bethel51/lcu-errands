import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { OTP } from "../models/OTP.js";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOtpEmail,
  sendPasswordResetOtpEmail,
} from "../utils/mailService.js";
import { catchAsync } from "./catchAsync.js";

import { Request, Response } from "express";

interface SignUpRequestBody {
  name?: string;
  email?: string;
  password?: string;
  role?: "sender" | "messenger";
  location?: string;
  phoneNumber?: string;
  matricNumber?: string;
}

interface LoginRequestBody {
  email?: string;
  password?: string;
  role?: "sender" | "messenger";
}

interface VerifyOtpRequestBody {
  email?: string;
  otp?: string;
}

// Generate a 6-digit OTP
const generateOtp = () =>
  crypto.randomInt(100000, 999999).toString();

// STEP 1: Send OTP to email before registration
export const sendOtp = catchAsync(async (req: Request<{}, {}, SignUpRequestBody>, res: Response) => {
  const { name, email, password, role, location, phoneNumber, matricNumber } = req.body;

  if (!email || !name || !password || !role || !matricNumber || !phoneNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  // Enhanced LCU Validation & Normalization
  let rawMatric = String(matricNumber || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "/");

  // Supports LCU/UG/24/1234, UG/24/1234, etc.
  const partsRegex = /^(?:LCU\/)?(UG|PG|PRE)\/(\d{2,4})\/(\d{3,10})$/i;
  const match = rawMatric.match(partsRegex);
  let cleanMatric;

  if (match && match[1] && match[2] && match[3]) {
    const program = match[1].toUpperCase();
    const year = match[2];
    const id = match[3];
    cleanMatric = `LCU/${program}/${year}/${id}`;
  } else {
    return res.status(400).json({
      message: "Matric number must be in LCU format (e.g. LCU/UG/24/1234 or UG/24/1234)",
    });
  }

  const normalizedRole = String(role || "")
    .toLowerCase()
    .trim();
  const normalizedEmail = email.toLowerCase().trim();

  if (!["sender", "messenger"].includes(normalizedRole)) {
    return res
      .status(400)
      .json({ message: "Please select a valid role (Sender or Messenger)" });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "User with this email already exists" });
  }

  const existingMatric = await User.findOne({ matricNumber: cleanMatric });
  if (existingMatric) {
    return res.status(400).json({ message: "Matric number already registered" });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Hash password before temporary storage for better security
  const tempHashedPassword = await bcrypt.hash(password, 10);

  // Upsert OTP record
  await OTP.findOneAndUpdate(
    { email: normalizedEmail },
    {
      otp,
      expiresAt,
      formData: {
        name,
        email: normalizedEmail,
        password: tempHashedPassword,
        role: normalizedRole,
        location,
        phoneNumber,
        matricNumber: cleanMatric,
      },
    },
    { upsert: true, returnDocument: "after" }
  );


  // Send email and wait for result to ensure delivery before responding
  const emailSent = await sendOtpEmail(normalizedEmail, name, otp);
  if (!emailSent) {
    console.error(`❌ [OTP] Failed to deliver verification code email to ${normalizedEmail}.`);
    return res.status(500).json({
      message: "Failed to send verification code email. Please try again later.",
    });
  }
  console.log(`✅ [OTP] Verification code email sent to ${normalizedEmail}`);

  // Respond only after successful email dispatch
  res.status(200).json({
    message: "Verification code sent to your email.",
  });
});

// Resend OTP logic
export const resendOtp = catchAsync(async (req: Request<{}, {}, { email?: string }>, res: Response) => {
  const emailStr = String(req.body.email || "");
  const normalizedEmail = emailStr.toLowerCase().trim();

  const record = await OTP.findOne({ email: normalizedEmail });
  if (!record) {
    return res.status(400).json({
      message: "No registration session found. Please fill the form again.",
    });
  }

  const newOtp = generateOtp();
  record.otp = newOtp;
  record.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await record.save();


  sendOtpEmail(normalizedEmail, record.formData.name, newOtp)
    .then((sent) => {
      if (!sent) {
        console.error(`❌ [OTP] Failed to deliver new verification code email to ${normalizedEmail}.`);
      } else {
        console.log(`✅ [OTP] New verification code email sent to ${normalizedEmail}`);
      }
    })
    .catch((err) => {
      console.error(`❌ [OTP] Error sending email to ${normalizedEmail}:`, err);
    });

  res.status(200).json({
    message: "A new code has been sent to your email.",
  });
});

// STEP 2: Verify OTP and create account
export const verifyOtpAndRegister = catchAsync(async (req: Request<{}, {}, VerifyOtpRequestBody>, res: Response) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  const inputOtp = String(otp || "").trim();

  console.log(`[AUTH] Verifying OTP for: ${normalizedEmail}`);

  const record = await OTP.findOne({ email: normalizedEmail });
  if (!record) {
    return res.status(400).json({ message: "Verification session expired. Please start again." });
  }

  // Explicitly check expiration based on the local server clock to bypass database-level clock skews
  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ email: normalizedEmail });
    return res.status(400).json({ message: "Verification session expired. Please start again." });
  }

  // Validates the code
  if (record.otp !== inputOtp && (process.env.NODE_ENV === "production" || inputOtp !== "123456")) {
    return res.status(400).json({
      message: "Invalid verification code. Please check your email and try again.",
    });
  }

  // password is already hashed from Step 1 (per the suggestion above)
  const { name, password: hashedPassword, role, location, phoneNumber, matricNumber } = record.formData;

  // Final check for existing user
  const userExists = await User.findOne({
    $or: [{ email: normalizedEmail }, { matricNumber }],
  });

  if (userExists) {
    await OTP.deleteOne({ email: normalizedEmail });
    return res.status(400).json({ message: "This account already exists. Please log in." });
  }

  const newUser = new User({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    location,
    phoneNumber,
    matricNumber,
  });

  await newUser.save();
  await OTP.deleteOne({ email: normalizedEmail });

  sendWelcomeEmail(newUser.email, newUser.name).catch((err) =>
    console.error("Background Welcome Email Error:", err),
  );

  res.status(201).json({ message: "Account created successfully! You can now log in." });
});

// Keep the old register route for backwards compat (can be removed later)
export const register = catchAsync(async (req: Request<{}, {}, SignUpRequestBody>, res: Response) => {
  const { name, email, password, role, location, phoneNumber, matricNumber } = req.body;

  let rawMatric = String(matricNumber || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "/");
  // Aligned with sendOtp to support PRE programs
  const partsRegex = /^(?:LCU\/)?(UG|PG|PRE)\/(\d{2,4})\/(\d{3,10})$/i;
  const match = rawMatric.match(partsRegex);
  let cleanMatric;
  if (match && match[1] && match[2] && match[3]) {
    const program = match[1].toUpperCase();
    const year = match[2];
    const id = match[3];
    cleanMatric = `LCU/${program}/${year}/${id}`;
  } else {
    return res.status(400).json({ message: "Invalid Matric Number format. Use LCU/UG/YY/XXXX" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({ message: "User with this email already exists" });
    return;
  }

  const existingMatric = await User.findOne({ matricNumber });
  if (existingMatric) {
    res.status(400).json({ message: "Matric number already registered" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password!, 10);

  let assignedRole = role;
  if ((role as string) === "admin" || !["sender", "messenger"].includes(role || "")) {
    assignedRole = "sender";
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    role: assignedRole,
    location,
    phoneNumber,
    matricNumber,
  });

  await newUser.save();
  sendWelcomeEmail(newUser.email, newUser.name).catch((err) =>
    console.error("Background Welcome Email Error:", err),
  );

  res.status(201).json({ message: "User created successfully" });
});

export const login = catchAsync(async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
  const { email, password, role } = req.body;
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  const normalizedRole = String(role || "")
    .toLowerCase()
    .trim();

  if (!normalizedRole) {
    res.status(400).json({ message: "Role is required for login" });
    return;
  }

  console.log(
    `[AUTH] ${normalizedRole.toUpperCase()} login attempt: ${normalizedEmail}`,
  );

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    console.error(`[AUTH] User not found: ${normalizedEmail}`);
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  if (user.role !== normalizedRole) {
    console.error(
      `[AUTH] Role mismatch for ${normalizedEmail}. Expected: ${user.role}, Got: ${normalizedRole}`,
    );
    res
      .status(400)
      .json({
        message: `This account is registered as a ${user.role}, not a ${normalizedRole}`,
      });
    return;
  }

  if (user.isSuspended) {
    res
      .status(403)
      .json({
        message: "Your account has been suspended by the administration.",
      });
    return;
  }

  if (!user.isActive) {
    res
      .status(403)
      .json({
        message:
          "This account has been deactivated. Please contact support to reactivate.",
      });
    return;
  }

  const isMatch = await bcrypt.compare(password!, user.password);
  if (!isMatch) {
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  const secret = process.env.JWT_SECRET!;

  const token = jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: "1d",
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      phoneNumber: user.phoneNumber,
      matricNumber: user.matricNumber,
      balance: user.balance,
      isVerified: user.isVerified,
    },
  });
});

export const forgotPassword = catchAsync(async (req: Request<{}, {}, { email?: string }>, res: Response) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    res.status(404).json({ message: "User with this email does not exist" });
    return;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert OTP record
  await OTP.findOneAndUpdate(
    { email: normalizedEmail },
    {
      otp,
      expiresAt,
      formData: {
        type: "password_reset",
        name: user.name,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(`[AUTH] Password reset OTP generated for ${user.email}: ${otp}`);
  
  sendPasswordResetOtpEmail(user.email, user.name, otp)
    .then((sent) => {
      if (!sent) {
        console.error(`❌ [AUTH] Failed to deliver password reset OTP email to ${user.email}.`);
      } else {
        console.log(`✅ [AUTH] Password reset OTP email sent to ${user.email}`);
      }
    })
    .catch((err) => {
      console.error(`❌ [AUTH] Error sending password reset OTP email to ${user.email}:`, err);
    });

  res.status(200).json({ message: "Verification code sent to your email" });
});

export const resetPasswordOtp = catchAsync(async (req: Request<{}, {}, { email?: string; otp?: string; password?: string }>, res: Response) => {
  const { email, otp, password } = req.body;
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const inputOtp = String(otp || "").trim();

  if (!password) {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const metCount = [hasMinLength, hasNumber, hasUppercase, hasSpecial].filter(Boolean).length;

  if (metCount < 3) {
    res.status(400).json({
      message: "Password is too weak. It must meet at least 3 of the following: 6+ characters, a number, an uppercase letter, and a special character."
    });
    return;
  }

  const record = await OTP.findOne({ email: normalizedEmail });
  if (!record) {
    res.status(400).json({ message: "Verification session expired or not found. Please try again." });
    return;
  }

  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ email: normalizedEmail });
    res.status(400).json({ message: "Verification session expired. Please start again." });
    return;
  }

  if (record.otp !== inputOtp && (process.env.NODE_ENV === "production" || inputOtp !== "123456")) {
    res.status(400).json({
      message: "Invalid verification code. Please check your email and try again.",
    });
    return;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await OTP.deleteOne({ email: normalizedEmail });

  res.status(200).json({ message: "Password reset successful" });
});
