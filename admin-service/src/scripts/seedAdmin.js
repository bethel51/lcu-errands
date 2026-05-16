import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin";

const seed = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/leadcity_errands");
    console.log("Connected to DB");

    let admin = await Admin.findOne({ email: "admin@lcu.edu.ng" });
    if (!admin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      admin = new Admin({
        name: "System Administrator",
        email: "admin@lcu.edu.ng",
        password: hashedPassword,
        securityKey: "LCU-SEC-999",
      });
      await admin.save();
      console.log("Admin created successfully.");
    } else {
      admin.password = await bcrypt.hash("admin123", 10);
      admin.securityKey = "LCU-SEC-999";
      await admin.save();
      console.log("Admin reset successfully.");
    }

    console.log("Credentials:");
    console.log("Email: admin@lcu.edu.ng");
    console.log("Password: admin123");
    console.log("Security Key: LCU-SEC-999");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
