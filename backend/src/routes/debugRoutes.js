import express from "express";
import nodemailer from "nodemailer";
import dns from "dns";
import { catchAsync } from "../controllers/catchAsync.js";

// Force Node.js to resolve IPv4 addresses first (fixes Render ENETUNREACH IPv6 issue)
dns.setDefaultResultOrder("ipv4first");

const router = express.Router();

// GET endpoint to check if route is live
router.get("/email", (req, res) => {
  res.json({ 
    message: "Debug Email Endpoint is LIVE! 🚀", 
    usage: "Send a POST request with {'email': 'your-email@example.com'} to trigger a raw SMTP test." 
  });
});

// POST endpoint to perform a raw, throwing SMTP test
router.post("/email", catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return res.status(400).json({
      success: false,
      message: "SMTP credentials are not configured in environment variables.",
      details: { user: user ? "Set" : "Missing", pass: pass ? "Set" : "Missing" }
    });
  }

  console.log(`[DEBUG] Executing direct SMTP test to: ${email}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  try {
    // 1. Verify connection structure
    await transporter.verify();
    console.log("[DEBUG] SMTP Verification Succeeded.");

    // 2. Send live email and capture info
    const info = await transporter.sendMail({
      from: `"LCU Errands Debug" <${user}>`,
      to: email,
      subject: "LeadCity Errands - Live SMTP Test ✅",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1E4DB7;">SMTP Live Test Successful! ✅</h2>
          <p>If you are reading this email, your live Render backend email integration is fully active and working!</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("[DEBUG] SMTP Direct Test Email Sent successfully.");

    res.status(200).json({
      success: true,
      message: "SMTP is fully operational! Test email sent successfully.",
      details: {
        messageId: info.messageId,
        recipient: email,
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        user
      }
    });
  } catch (error) {
    console.error("[DEBUG] Live SMTP Test Failed:", error);
    res.status(500).json({
      success: false,
      message: "SMTP Connection or Delivery Failed.",
      error: error.message || error,
      code: error.code,
      command: error.command
    });
  }
}));

export default router;
