import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dnsPromises from "dns/promises";
dotenv.config();

async function testConnection(host, port, secure, user, pass) {
  let resolvedHost = host;
  try {
    const { address } = await dnsPromises.lookup(host, { family: 4 });
    resolvedHost = address;
    console.log(`[DNS] Resolved ${host} to ${resolvedHost}`);
  } catch (err) {
    console.log(`[DNS] Lookup failed for ${host}: ${err.message}`);
  }

  console.log(`\nTesting connection to ${host} (${resolvedHost}) on port ${port} (secure: ${secure})...`);
  const transporter = nodemailer.createTransport({
    host: resolvedHost,
    port: port,
    secure: secure,
    tls: { servername: host },
    auth: { user, pass },
    connectionTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log(`✅ Success connecting to port ${port}!`);
    return { success: true, transporter };
  } catch (error) {
    console.log(`❌ Failed connecting to port ${port}: ${error.message}`);
    return { success: false, error };
  }
}

async function testEmail() {
  const testRecipient = process.argv[2] || "ifeanyichukwubethel2@gmail.com";
  console.log("--- SMTP Configuration Test ---");
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error("SMTP_USER/EMAIL_USER and SMTP_PASS/EMAIL_PASS must be configured in .env");
    return;
  }

  // Test 1: Port 465 with secure: true
  const res465 = await testConnection(host, 465, true, user, pass);

  // Test 2: Port 587 with secure: false
  const res587 = await testConnection(host, 587, false, user, pass);

  const activeRes = res465.success ? res465 : (res587.success ? res587 : null);

  if (activeRes) {
    console.log(`\nAttempting to send actual test email to ${testRecipient} using successful configuration...`);
    try {
      const info = await activeRes.transporter.sendMail({
        from: `"LCU Errands Test" <${user}>`,
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
      console.log("✅ Email sent successfully! Message ID:", info.messageId);
    } catch (sendErr) {
      console.error("❌ Failed to send email after successful verification:", sendErr.message);
    }
  } else {
    console.error("\n❌ Both port 465 and port 587 failed to connect. Please check internet connection or SMTP credentials.");
  }
}

testEmail();

