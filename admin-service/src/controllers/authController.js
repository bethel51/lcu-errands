import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";

export const login = async (req, res) => {
  try {
    const { email, password, securityKey } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      res.status(401).json({ message: "Authorization Failed" });
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch || admin.securityKey !== securityKey) {
      res.status(401).json({ message: "Authorization Failed" });
      return;
    }

    const token = jwt.sign(
      { id: admin._id, name: admin.name, role: "super-admin" },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "8h" },
    );

    admin.lastLogin = new Date();
    await admin.save();

    res.json({ token, admin: { name: admin.name, email: admin.email } });
  } catch (error) {
    res.status(500).json({ message: "System error" });
  }
};

export const createInitialAdmin = async (req, res) => {
  try {
    // Defence-in-depth: verify setup mode is still active at the controller level
    if (process.env.SETUP_MODE !== "true") {
      console.warn(
        `🛡️ [SETUP] Blocked /auth/init at controller level — SETUP_MODE is not enabled. IP: ${req.ip}`,
      );
      res.status(403).json({ message: "Setup mode is not enabled." });
      return;
    }

    // Only allow if no admins exist
    const count = await Admin.countDocuments();
    if (count > 0) {
      res.status(403).json({ message: "Initialization already complete" });
      return;
    }

    const { name, email, password, securityKey } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      securityKey,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Primary Admin Created" });
  } catch (error) {
    res.status(500).json({ message: "Initialization failed" });
  }
};
