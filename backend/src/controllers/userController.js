import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import axios from "axios";
import { sendTopUpNotification } from "../utils/mailService.js";
import { catchAsync } from "./catchAsync.js";
import crypto from "crypto";

export const updateProfile = catchAsync(async (req, res) => {
  const { location, profilePicture, phoneNumber, name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // Build update object dynamically to only update provided fields
  const updateFields = { location, profilePicture, phoneNumber };
  if (name) updateFields.name = name;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true },
  ).select("-password");

  if (!updatedUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json(updatedUser);
});

export const getProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(userId).select("-password").lean();
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json(user);
});

export const getMessengers = catchAsync(async (req, res) => {
  const { page = 1, limit = 24, search = "", location = "" } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = { role: "messenger", isActive: true, isSuspended: false };

  if (search) query.name = { $regex: search, $options: "i" };
  if (location) query.location = location;

  const messengers = await User.find(query)
    .select(
      "name profilePicture rating location isBoosted isVerified bio isOnline",
    )
    .sort({ isBoosted: -1, rating: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  res.json(messengers);
});

export const boostProfile = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const BOOST_FEE = 200;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user || user.balance < BOOST_FEE) {
      await session.abortTransaction();
      res.status(400).json({ message: "Insufficient balance to boost profile" });
      return;
    }

    user.balance -= BOOST_FEE;
    user.isBoosted = true;
    user.boostUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save({ session });

    await Transaction.create(
      [
        {
          userId: user._id,
          amount: BOOST_FEE,
          type: "debit",
          description: "Profile Boost (24 Hours)",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.json({ message: "Profile boosted successfully!", user });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

});

export const topUp = catchAsync(async (req, res) => {
  const { amount, email } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // IF PAYSTACK KEY IS NOT SET, FALLBACK TO MOCK TOP-UP FOR TESTING
  if (!process.env.PAYSTACK_SECRET_KEY) {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    user.balance += Number(amount);
    await user.save();
    await Transaction.create({
      userId,
      amount: Number(amount),
      type: "credit",
      description: "Wallet Top-up (Dev Mode)",
    });

    // Background email notification
    sendTopUpNotification(
      user.email,
      user.name,
      Number(amount),
      user.balance,
    ).catch((err) => console.error("Failed to send top up email", err));

    res.json({ message: "Mock top-up successful", user });
    return;
  }

  // REAL PAYSTACK INITIALIZATION
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: email || (await User.findById(userId))?.email,
      amount: Number(amount) * 100, // Paystack uses Kobo
      callback_url: `${process.env.FRONTEND_URL}/profile`,
      metadata: { userId, amount },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  res.json({ checkout_url: response.data.data.authorization_url });
});

export const handlePaystackWebhook = catchAsync(async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.sendStatus(500);
    return;
  }

  // Verify Paystack Signature
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    res.status(401).json({ message: "Invalid signature" });
    return;
  }

  const { event, data } = req.body;

  if (event === "charge.success") {
    const { userId, amount } = data.metadata;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (user) {
        user.balance += Number(amount);
        await user.save({ session });

        await Transaction.create(
          [
            {
              userId,
              amount: Number(amount),
              type: "credit",
              description: "Wallet Deposit (Paystack)",
              errandId: data.reference,
            },
          ],
          { session },
        );

        await session.commitTransaction();

        // Background email notification (non-critical)
        sendTopUpNotification(
          user.email,
          user.name,
          Number(amount),
          user.balance,
        ).catch((err) =>
          console.error("Failed to send top up email via webhook", err),
        );
      } else {
        await session.abortTransaction();
      }
    } catch (error) {
      await session.abortTransaction();
      console.error("Paystack Webhook Transaction Error:", error);
      // Don't throw here to ensure Paystack gets a 200/OK if we handled it
    } finally {
      session.endSession();
    }
  }


  res.sendStatus(200);
});

export const getTransactions = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const transactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  res.json(transactions);
});

export const uploadProfilePicture = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const { uploadToCloudinary } = await import("../utils/cloudinaryUpload.js");
    const imageUrl = await uploadToCloudinary(req.file.buffer, "profile_pics");
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      { new: true },
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
});

export const uploadFile = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const { uploadToCloudinary } = await import("../utils/cloudinaryUpload.js");
    const fileUrl = await uploadToCloudinary(req.file.buffer, "misc_files");
    res.json({ url: fileUrl });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "File upload failed" });
  }
});

export const verifySelf = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  user.isVerified = true;
  await user.save();

  res.json({ message: "Account verified successfully", user });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  try {
    // 1. Delete the user
    await User.findByIdAndDelete(userId);

    // 2. Cascade delete all user-related documents dynamically to avoid circular dependencies
    const { Errand } = await import("../models/Errand.js");
    const { Review } = await import("../models/Review.js");
    const { Notification } = await import("../models/Notification.js");
    const { Message } = await import("../models/Message.js");
    const { OTP } = await import("../models/OTP.js");
    const { WithdrawalRequest } = await import("../models/WithdrawalRequest.js");

    await Errand.deleteMany({ $or: [{ posterId: userId }, { erranderId: userId }] });
    await Transaction.deleteMany({ userId });
    await Notification.deleteMany({ userId });
    await Review.deleteMany({ $or: [{ reviewerId: userId }, { revieweeId: userId }] });
    await Message.deleteMany({ senderId: userId });
    await WithdrawalRequest.deleteMany({ userId });
    await OTP.deleteMany({ email: user.email });
  } catch (error) {
    console.error("Error during cascade deletion:", error);
    throw error;
  }

  res.json({ message: "Account deleted permanently" });
});
