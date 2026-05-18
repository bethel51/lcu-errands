import axios from "axios";

/**
 * Dispatches a 6-digit verification OTP code directly to a user's WhatsApp number using Twilio's API.
 * Supports E.164 normalization for Nigerian (+234) and international numbers automatically.
 * Supports both standard Account SID/Auth Token and API Key SID/Secret authentication.
 */
export const sendWhatsAppOtp = async (phoneNumber: string, name: string, otp: string): Promise<void> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID; // Always required for URL path (starts with AC...)
  const authToken = process.env.TWILIO_AUTH_TOKEN;   // Twilio Auth Token OR Twilio API Key SID (starts with SK...)
  const apiSecret = process.env.TWILIO_API_SECRET;   // Twilio API Key Secret (starts with iCgn... if using API Key)
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886"; // Twilio sandbox default

  if (!accountSid || !authToken) {
    console.warn("⚠️ Twilio credentials missing in .env. Skipping WhatsApp OTP dispatch.");
    return;
  }

  // 1. Normalize the phone number to standard E.164 format
  let cleanPhone = phoneNumber.replace(/[^0-9]/g, ""); // strip all non-digits
  
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "234" + cleanPhone.slice(1); // Convert 080... to 23480... (default country Nigeria)
  }
  
  const to = `whatsapp:+${cleanPhone}`;

  try {
    // 2. Select proper credentials: Use API Key SID + Secret if secret is defined, else Account SID + Auth Token
    const username = apiSecret ? authToken : accountSid;
    const password = apiSecret ? apiSecret : authToken;
    
    const authHeader = Buffer.from(`${username}:${password}`).toString("base64");

    console.log(`[WhatsApp Service] Attempting to dispatch OTP code to ${to}...`);

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: `Hello ${name}! Your LeadCity Errands verification code is: ${otp}. It is valid for 10 minutes.`,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(`✅ WhatsApp OTP successfully dispatched to ${to}`);
  } catch (err: any) {
    const errorResponse = err.response?.data;
    console.error("❌ Twilio WhatsApp Dispatch Failure:", {
      message: err.message,
      details: errorResponse,
    });
  }
};
