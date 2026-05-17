import nodemailer from "nodemailer";
import dns from "dns";

// Force Node.js to resolve IPv4 addresses first (fixes Render ENETUNREACH IPv6 issue)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000, // 10s timeout — prevents SMTP hangs
  greetingTimeout: 8000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// Verify SMTP config on startup (non-fatal — just logs result)
transporter.verify((error) => {
  if (error) {
    console.error("⚠️ SMTP connection failed:", error.message);
  } else {
    console.log("✅ SMTP server is ready to send emails.");
  }
});

export const sendEmail = async (to, subject, text, html) => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("⚠️ Email credentials not set. Skipping email notification.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"LCU Errands" <${user}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(
      `📧 Email sent successfully to ${to}. MessageId: ${info.messageId}`,
    );
  } catch (error) {
    console.error("❌ FATAL EMAIL ERROR ❌");
    console.error("Target:", to);
    console.error("Subject:", subject);
    console.error("Error:", error.message || error);
    if (error.code === "EAUTH") {
      console.error(
        "Authentication failed: Check your SMTP_USER and SMTP_PASS (App Password).",
      );
    }
  }
};

export const sendErrandNotification = async (
  userEmail,
  userName,
  type,
  errandTitle,
) => {
  const subjects = {
    accepted: "Your Errand has been Accepted! 🚀",
    completed: "Errand Completed! ✅",
    completed_errander: "Errand Successfully Completed! 🎉",
    requested: "New Direct Errand Request! 📬",
  };

  const titles = {
    accepted: "Good news! Your errand has been accepted.",
    completed: "Mission Accomplished! 🏁",
    completed_errander: "Great Job! 🌟",
    requested: "Someone wants to hire you!",
  };

  const messages = {
    accepted: `Your errand <b>"${errandTitle}"</b> is now being handled by a messenger. You can track the progress on your dashboard.`,
    completed: `Your errand <b>"${errandTitle}"</b> has been marked as completed. Please log in to confirm delivery and release the funds.`,
    completed_errander: `You have successfully completed the errand <b>"${errandTitle}"</b>. The fee has been credited to your wallet balance.`,
    requested: `You have received a direct request for the errand: <b>"${errandTitle}"</b>. Check your dashboard to accept the task.`,
  };

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">${titles[type]}</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid #1E4DB7; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">${messages[type]}</p>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 77, 183, 0.2);">View on Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;

  await sendEmail(userEmail, subjects[type], messages[type], html);
};

export const sendPasswordResetEmail = async (userEmail, resetUrl) => {
  const subject = "Password Reset Request - LCU Errands 🔑";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">Password Reset</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">You requested to reset your password for your LCU Errands account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 77, 183, 0.2);">Reset Password</a>
        </div>
        <p style="color: #6B7280; font-size: 14px; text-align: center; margin-bottom: 24px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, "Password Reset Request", html);
};

export const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = "Welcome to LCU Errands! 🎓";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">Welcome to the Community!</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid #1E4DB7; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">We're excited to have you join the Lead City University errands community. Whether you want to save time or earn extra cash, you're in the right place.</p>
          <ul style="margin: 16px 0 0 0; padding-left: 20px; color: #4B5563; line-height: 1.6;">
            <li>Post your first errand from the dashboard.</li>
            <li>Top up your wallet to pay messengers instantly.</li>
            <li>Apply for verification to start earning as a messenger.</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 77, 183, 0.2);">Go to Dashboard</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, "Welcome to LCU Errands!", html);
};

export const sendPayoutNotification = async (
  userEmail,
  userName,
  status,
  amount,
) => {
  const subject =
    status === "approved"
      ? "Payout Successful! 💰"
      : "Withdrawal Request Update ⚠️";
  const title =
    status === "approved"
      ? "Your Payout is on the Way!"
      : "Withdrawal Request Rejected";
  const message =
    status === "approved"
      ? `Great news! Your withdrawal request for <b>₦${amount.toLocaleString()}</b> has been approved and processed. Please check your bank account within the next few hours.`
      : `Your withdrawal request for <b>₦${amount.toLocaleString()}</b> was not approved. The funds have been returned to your LCU Errand wallet. Please contact support if you have questions.`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${status === "approved" ? "#10B981" : "#EF4444"}; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">${title}</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid ${status === "approved" ? "#10B981" : "#EF4444"}; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/profile" style="background-color: #111827; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">View Wallet</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated payment notification from LCU Errands.</p>
      </div>
    </div>
  `;

  await sendEmail(userEmail, subject, message, html);
};

export const sendTopUpNotification = async (
  userEmail,
  userName,
  amount,
  newBalance,
) => {
  const subject = "Wallet Top-Up Successful! 💳";
  const message = `Your wallet has been successfully credited with ₦${amount.toLocaleString()}. Your new balance is ₦${newBalance.toLocaleString()}.`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">Deposit Successful</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid #1E4DB7; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/profile" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 77, 183, 0.2);">View Wallet</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated payment notification from LCU Errands.</p>
      </div>
    </div>
  `;

  await sendEmail(userEmail, subject, message, html);
};

export const sendVerificationEmail = async (
  userEmail,
  userName,
  status,
  reason,
) => {
  const subject =
    status === "verified"
      ? "Identity Verified! 🛡️"
      : "Verification Update Required ⚠️";
  const title =
    status === "verified"
      ? "You are now a Verified Messenger!"
      : "Verification Request Update";
  const message =
    status === "verified"
      ? `Congratulations ${userName}! Your identity has been verified. You now have a verification badge and can earn more by handling high-value errands.`
      : `Your identity verification request was not approved. <br><br><b>Reason:</b> ${reason || "Incomplete information."}<br><br>Please log in and re-upload a clear copy of your LCU ID card.`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${status === "verified" ? "#1E4DB7" : "#F59E0B"}; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">${title}</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid ${status === "verified" ? "#1E4DB7" : "#F59E0B"}; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/profile" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Update Profile</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from LCU Errands.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, message, html);
};

export const sendSuspensionEmail = async (userEmail, userName, isSuspended) => {
  const subject = isSuspended
    ? "Account Suspended - LCU Errands ⚠️"
    : "Account Reactivated! ✅";
  const title = isSuspended
    ? "Your account has been suspended"
    : "Welcome back! Your account is active";
  const message = isSuspended
    ? "An administrator has suspended your account due to a violation of our terms of service. Please contact support if you believe this is an error."
    : "Good news! Your account has been reactivated by the administration. You can now log in and continue using LCU Errands.";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: ${isSuspended ? "#EF4444" : "#10B981"}; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">${title}</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid ${isSuspended ? "#EF4444" : "#10B981"}; margin-bottom: 32px;">
          <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0;">${message}</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from LCU Errands.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, message, html);
};

export const sendOtpEmail = async (userEmail, userName, otp) => {
  const subject = "LeadCity Errands - Your Verification Code";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1E4DB7; margin-bottom: 20px;">Email Verification</h2>
      <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
      <p style="font-size: 16px; color: #333;">Please use the following verification code to complete your registration. This code expires in 10 minutes.</p>
      <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1E4DB7;">${otp}</span>
      </div>
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px;">If you did not request this, please ignore this email. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;
  await sendEmail(userEmail, subject, `Your OTP is: ${otp}`, html);
};
