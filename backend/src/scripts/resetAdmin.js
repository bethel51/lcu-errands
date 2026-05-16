import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/leadcity_errands";
const EMAIL = process.env.ADMIN_EMAIL || "ifeanyichukwubethel2@gmail.com";
const NEW_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;

if (!NEW_PASSWORD) {
  console.error(
    "ERROR: ADMIN_INITIAL_PASSWORD environment variable is not set.",
  );
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    const result = await mongoose.connection.db
      ?.collection("users")
      .updateOne(
        { email: EMAIL },
        { $set: { password: hashedPassword, role: "admin", isVerified: true } },
      );

    if (result && result.matchedCount > 0) {
      console.log(
        `SUCCESS: Password for ${EMAIL} has been reset to: ${NEW_PASSWORD}`,
      );
      console.log("Role has also been confirmed as ADMIN.");
    } else {
      console.log(`ERROR: User ${EMAIL} not found.`);
    }
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

resetPassword();
