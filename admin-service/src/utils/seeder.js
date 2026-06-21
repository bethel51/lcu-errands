import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";

export const seedDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      console.log("🛡️ [SEED] Admin accounts already exist. Skipping seeder.");
      return;
    }

    const email = (process.env.ADMIN_EMAIL || "admin@lcuerrands.com").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "AdminSecure2026!";
    const securityKey = process.env.ADMIN_SECURITY_KEY || "lcu_secure_vault";
    const name = process.env.ADMIN_NAME || "System Administrator";

    const hashedPassword = await bcrypt.hash(password, 10);

    const defaultAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      securityKey,
    });

    await defaultAdmin.save();
    console.log(`✅ [SEED] Default Admin created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Security Key: ${securityKey}`);
    console.log(`🔒 Password: ${password}`);
  } catch (err) {
    console.error("❌ [SEED] Failed to seed default admin:", err);
  }
};
