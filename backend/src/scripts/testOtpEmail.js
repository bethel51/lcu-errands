// src/scripts/testOtpEmail.js
import { config } from 'dotenv';
config({ path: '../../.env' });
import { sendOtpEmail } from '../utils/mailService.js';

const testEmail = process.env.EMAIL_USER; // using the same address for testing
const testName = 'Test User';
const testOtp = '123456';

(async () => {
  try {
    const sent = await sendOtpEmail(testEmail, testName, testOtp);
    console.log('Send OTP result:', sent);
  } catch (err) {
    console.error('Error sending OTP:', err);
  }
})();
