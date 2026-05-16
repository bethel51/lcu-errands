import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Use the exact path to your .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/leadcity_errands";
const USER_EMAIL = process.env.ADMIN_EMAIL || "ifeanyichukwubethel2@gmail.com";

async function promote() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const user = await mongoose.connection.db
      ?.collection("users")
      .findOneAndUpdate(
        { email: USER_EMAIL },
        { $set: { role: "admin", isVerified: true } },
      );

    if (user) {
      console.log(`\x1b[32mSUCCESS: ${USER_EMAIL} is now an ADMIN!\x1b[0m`);
      console.log(
        "Please log out and log back in on the website to see the changes.",
      );
    } else {
      console.log(
        `\x1b[31mERROR: User with email ${USER_EMAIL} not found.\x1b[0m`,
      );
      console.log("Make sure you have registered with this exact email.");
    }
  } catch (error) {
    console.error("Promotion failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

promote();
