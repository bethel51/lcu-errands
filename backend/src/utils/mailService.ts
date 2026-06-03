import nodemailer from "nodemailer";
import dns from "dns";

// Force Node.js to prefer IPv4 for DNS lookups to prevent IPv6 ENETUNREACH errors
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpSecure = process.env.SMTP_SECURE === "true";
const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
const emailPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();

const transporter = nodemailer.createTransport(
  smtpHost
    ? {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      }
    : {
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      }
);

// Initialize transporter verification only in development when SMTP credentials are set
if (emailUser && emailPass) {
  console.log("[EMAIL] Initializing transporter verification...");
  transporter.verify((error) => {
    if (error) {
      console.error("⚠️ Email connection failed:", error.message);
    } else {
      console.log("✅ Email server is ready to send emails.");
    }
  });
}

export const sendEmail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  const brevoApiKey = (process.env.BREVO_API_KEY || "").trim();
  const emailFrom = process.env.EMAIL_FROM || "no-reply@leadcityerrands.com";
  const senderName = process.env.EMAIL_SENDER_NAME || "LCU Errands";

  if (brevoApiKey) {
    try {
      console.log(`📡 [Brevo API] Sending email to ${to}...`);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: emailFrom,
          },
          to: [
            {
              email: to,
            },
          ],
          subject,
          htmlContent: html || text,
          textContent: text,
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        console.log(`📧 Email sent successfully via Brevo API to ${to}. MessageId: ${data.messageId}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ Brevo API ERROR: Failed to send email", response.status, errorText);
        console.log("Falling back to SMTP / Mock Email...");
      }
    } catch (error: any) {
      console.error("❌ Brevo API ERROR: Failed to send email");
      console.error("Target:", to);
      console.error("Error Message:", error.message);
      console.log("Falling back to SMTP / Mock Email...");
    }
  }

  // Fallback to Nodemailer
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();

  if (!emailUser || !emailPass) {
    console.warn("⚠️ Email credentials not set. Email not sent.");
    return false; // Return false since email actually failed
  }

  try {
    console.log(`📡 [EMAIL] Sending email to ${to}...`);
    const info = await transporter.sendMail({
      from: `"LCU Errands" <${emailUser}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log(
      `📧 Email sent successfully to ${to}. MessageId: ${info.messageId}`,
    );
    return true;
  } catch (error: any) {
    console.error("❌ EMAIL ERROR: Failed to send email");
    console.error("Target:", to);
    console.error("Error Code:", error.code); // e.g., ETIMEDOUT, EAUTH
    console.error("Error Message:", error.message);

    if (error.code === "EAUTH") {
      console.error(
        "Authentication failed: Check your EMAIL_USER and EMAIL_PASS (App Password).",
      );
    }
    
    return false; 
  }
};

export const sendErrandNotification = async (
  userEmail: string,
  userName: string,
  type: "accepted" | "completed" | "completed_errander" | "requested",
  errandTitle: string,
): Promise<boolean> => {
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

  return await sendEmail(userEmail, subjects[type], messages[type], html);
};

export const sendPasswordResetEmail = async (userEmail: string, resetUrl: string): Promise<boolean> => {
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
  return await sendEmail(userEmail, subject, "Password Reset Request", html);
};

export const sendWelcomeEmail = async (userEmail: string, userName: string): Promise<boolean> => {
  const subject = "Welcome to LCU Errands! 🎓";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">Welcome to LCU Errands, ${userName}! 🎉</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We are thrilled to welcome you to the official errand platform for Lead City University students.</p>
        
        <div style="background-color: #F9FAFB; padding: 24px; border-radius: 12px; border-left: 4px solid #1E4DB7; margin-bottom: 32px;">
          <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">Here are a few things you can do to get started:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.6;">
            <li style="margin-bottom: 8px;"><b>Post Errands:</b> Need someone to grab food, buy materials, or deliver files? Post it instantly and select a trusted messenger.</li>
            <li style="margin-bottom: 8px;"><b>Earn Extra Income:</b> Apply to become a verified messenger and get paid for helping other students.</li>
            <li style="margin-bottom: 8px;"><b>Secure Wallet:</b> Funds are held safely in escrow and are only released when you confirm successful completion.</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #1E4DB7; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(30, 77, 183, 0.2);">Explore Your Dashboard</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;
  return await sendEmail(userEmail, subject, "Welcome to LCU Errands!", html);
};

export const sendPayoutNotification = async (
  userEmail: string,
  userName: string,
  status: "approved" | "rejected",
  amount: number,
): Promise<boolean> => {
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

  return await sendEmail(userEmail, subject, message, html);
};

export const sendTopUpNotification = async (
  userEmail: string,
  userName: string,
  amount: number,
  newBalance: number,
): Promise<boolean> => {
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

  return await sendEmail(userEmail, subject, message, html);
};

export const sendVerificationEmail = async (
  userEmail: string,
  userName: string,
  status: "verified" | "rejected",
  reason?: string,
): Promise<boolean> => {
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
  return await sendEmail(userEmail, subject, message, html);
};

export const sendSuspensionEmail = async (userEmail: string, userName: string, isSuspended: boolean): Promise<boolean> => {
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
  return await sendEmail(userEmail, subject, message, html);
};

export const sendOtpEmail = async (userEmail: string, userName: string, otp: string): Promise<boolean> => {
  const subject = "LeadCity Errands - Your Verification Code 🔐";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1E4DB7; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LCU ERRANDS</h1>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px; font-weight: 800;">Verify Your Email</h2>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${userName},</p>
        <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Please use the verification code below to complete your registration. This code is valid for 10 minutes.</p>
        
        <div style="background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); padding: 24px; border-radius: 16px; text-align: center; margin: 30px 0; border: 1px solid #E5E7EB;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #1E4DB7; font-family: monospace;">${otp}</span>
        </div>

        <p style="color: #6B7280; font-size: 14px; margin-bottom: 24px; text-align: center;">Do not share this code with anyone. If you didn't request this code, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #F3F4F6; margin-bottom: 24px;" />
        <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">This is an automated notification from Lead City University Errands.</p>
      </div>
    </div>
  `;
  return await sendEmail(userEmail, subject, `Your OTP is: ${otp}`, html);
};
