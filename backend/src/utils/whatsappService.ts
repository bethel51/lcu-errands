import axios from "axios";

/**
 * Dispatches a 6-digit verification OTP code directly to a user's phone number using Telnyx's Unified Message API.
 * Supports E.164 normalization for Nigerian (+234) and international numbers automatically.
 * Depending on your Telnyx number configuration, it will deliver via SMS or WhatsApp seamlessly.
 */
export const sendWhatsAppOtp = async (phoneNumber: string, name: string, otp: string): Promise<void> => {
  const apiKey = process.env.TELNYX_API_KEY;
  const fromNumber = process.env.TELNYX_FROM_NUMBER; // Your Telnyx purchased phone number

  if (!apiKey || !fromNumber) {
    console.warn("⚠️ Telnyx credentials missing in .env. Skipping SMS/WhatsApp OTP dispatch.");
    return;
  }

  // 1. Normalize the phone number to standard E.164 format (+234...)
  let cleanPhone = phoneNumber.replace(/[^0-9]/g, ""); // strip all non-digits
  
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "234" + cleanPhone.slice(1); // Convert 080... to 23480... (default country Nigeria)
  }
  
  const to = `+${cleanPhone}`;

  try {
    console.log(`[Telnyx Service] Attempting to dispatch OTP code to ${to}...`);

    await axios.post(
      "https://api.telnyx.com/v2/messages",
      {
        from: fromNumber,
        to: to,
        text: `Hello ${name}! Your LeadCity Errands verification code is: ${otp}. It is valid for 10 minutes.`,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Telnyx OTP successfully dispatched to ${to}`);
  } catch (err: any) {
    const errorResponse = err.response?.data;
    console.error("❌ Telnyx Messaging Dispatch Failure:", {
      message: err.message,
      details: errorResponse,
    });
  }
};

