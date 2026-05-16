import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/leadcity_errands";
const USER_EMAIL = "ifeanyichukwubethel2@gmail.com";

async function check() {
  try {
    await mongoose.connect(MONGODB_URI);
    const user = await mongoose.connection.db
      ?.collection("users")
      .findOne({ email: USER_EMAIL });

    if (user) {
      console.log("--- User Status ---");
      console.log("Email:", user.email);
      console.log("Role:", user.role);
      console.log("IsVerified:", user.isVerified);
      console.log("-------------------");
    } else {
      console.log("User not found!");
    }
  } catch (error) {
    console.error("Check failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

check();
