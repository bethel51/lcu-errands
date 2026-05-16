import express from "express";
import { sendEmail } from "../utils/mailService.js";
import { catchAsync } from "../controllers/catchAsync.js";

const router = express.Router();

// Simple GET check to see if the route is live
router.get("/email", (req, res) => {
  res.json({ 
    message: "Debug Email Endpoint is LIVE! 🚀", 
    usage: "Send a POST request with {'email': 'your-email@example.com'} to trigger a test." 
  });
});

// Test email endpoint
router.post("/email", catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  console.log(`[DEBUG] Triggering test email to: ${email}`);

  try {
    await sendEmail(
      email,
      "LeadCity Errands - Test Email",
      "This is a test email to verify your SMTP configuration. If you're reading this, your email service is working! ✅",
      `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1E4DB7;">SMTP Test Successful! ✅</h2>
          <p>This is a test email from your LeadCity Errands backend.</p>
          <p><b>Configuration Details:</b></p>
          <ul>
            <li><b>Host:</b> ${process.env.SMTP_HOST || "smtp.gmail.com"}</li>
            <li><b>User:</b> ${process.env.SMTP_USER || "Not Set"}</li>
            <li><b>Environment:</b> ${process.env.NODE_ENV || "development"}</li>
          </ul>
          <p>If you received this, your email service is live and ready.</p>
        </div>
      `
    );

    res.status(200).json({ 
      message: "Test email sent successfully! Please check your inbox (and spam folder).",
      details: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        user: process.env.SMTP_USER || "Not Set"
      }
    });
  } catch (error) {
    console.error("❌ Test Email Failed:", error);
    res.status(500).json({ 
      message: "Failed to send test email.",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

export default router;
