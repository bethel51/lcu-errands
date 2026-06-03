import dotenv from "dotenv";
import { sendEmail } from "../utils/mailService.js";

dotenv.config();

async function runTest() {
  const emailFrom = process.env.EMAIL_FROM || "ifeanyichukwubethel2@gmail.com";
  console.log("--- Testing Brevo API Configuration ---");
  console.log("Sender Email (EMAIL_FROM):", emailFrom);
  console.log("API Key (BREVO_API_KEY):", process.env.BREVO_API_KEY ? "Present (Starts with " + process.env.BREVO_API_KEY.slice(0, 10) + "...)" : "Missing");

  console.log("\nAttempting to send a test email to the sender...");
  const success = await sendEmail(
    emailFrom,
    "Test Brevo Integration 🚀",
    "This is a plain text test email to verify Brevo is working.",
    "<h3>Brevo Integration Successful!</h3><p>Your transactional email service is working perfectly.</p>"
  );

  if (success) {
    console.log("✅ Brevo API Test Completed Successfully!");
  } else {
    console.error("❌ Brevo API Test Failed. See error messages above.");
  }
}

runTest();
