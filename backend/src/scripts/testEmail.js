import nodemailer from "nodemailer";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  const testRecipient = process.argv[2] || "ifeanyichukwubethel2@gmail.com";
  console.log("--- Email Configuration Test ---");
  console.log("SMTP Host:", process.env.SMTP_HOST || "smtp.gmail.com");
  console.log("SMTP User:", process.env.SMTP_USER);
  console.log("Sending test email to:", testRecipient);

  try {
    const info = await transporter.sendMail({
      from: `"LCU Errands Test" <${process.env.SMTP_USER}>`,
      to: testRecipient,
      subject: "Test Email from LCU Errands 🚀",
      text: "This is a test email to verify your SMTP configuration is working correctly.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1E4DB7;">SMTP Test Successful!</h2>
          <p>Your email service is correctly configured for <b>LCU Errands</b>.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error.message || error);
    if (error.code === "EAUTH") {
      console.error(
        '\nTIP: For Gmail, make sure you use an "App Password", not your regular password.',
      );
      console.error("Go to: https://myaccount.google.com/apppasswords");
    }
  }
}

testEmail();
