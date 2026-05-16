import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { Notification } from "../models/Notification.js";
import { Message } from "../models/Message.js";
import {
  sendPayoutNotification,
  sendVerificationEmail,
  sendSuspensionEmail,
  sendBroadcastEmail,
} from "../utils/mailService.js";
import { Log } from "../models/Log.js";
import { Transaction } from "../models/Transaction.js";
import { catchAsync } from "../utils/catchAsync.js";

export const getStats = catchAsync(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalErrands = await Errand.countDocuments();
  const completedErrands = await Errand.countDocuments({ status: "completed" });

  const totalFees = await Errand.aggregate([
    { $group: { _id: null, total: { $sum: "$fee" } } },
  ]);

  // Calculate 7-day revenue trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const revenueTrends = await Errand.aggregate([
    { $match: { status: "completed", createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$fee" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Calculate 7-day errand volume trend
  const errandTrends = await Errand.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Calculate user growth
  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totalUsers,
    totalErrands,
    completedErrands,
    totalFees: totalFees[0]?.total || 0,
    revenueTrends,
    errandTrends,
    userGrowth,
  });
});

export const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

export const getAllErrands = catchAsync(async (req, res) => {
  const errands = await Errand.find()
    .populate("posterId", "name email")
    .populate("erranderId", "name email")
    .sort({ createdAt: -1 });
  res.json(errands);
});

export const toggleSuspendUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  user.isSuspended = !user.isSuspended;
  await user.save();

  await Notification.create({
    userId: user._id,
    title: user.isSuspended ? "Account Suspended ⚠️" : "Account Reactivated ✅",
    message: user.isSuspended
      ? "Your account has been suspended by an administrator. Please contact support for details."
      : "Your account has been reactivated. You can now use the platform again.",
    type: "account_update",
    relatedId: user._id,
  });

  // Background email notification
  sendSuspensionEmail(user.email, user.name, user.isSuspended).catch((err) =>
    console.error("Suspension Email Error:", err),
  );

  await Log.create({
    adminId: req.admin.id,
    adminName: req.admin.name || "Admin",
    action: user.isSuspended ? "SUSPEND_USER" : "REACTIVATE_USER",
    targetId: user._id.toString(),
    targetName: user.name,
    details: `User status changed to ${user.isSuspended ? "Suspended" : "Active"}`,
  });

  res.json({
    message: `User ${user.isSuspended ? "suspended" : "unsuspended"} successfully`,
    user,
  });
});

export const verifyUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body || {};
  const isVerified = status === "verified";

  const user = await User.findByIdAndUpdate(
    id,
    { isVerified, verificationStatus: status, verificationReason: reason },
    { new: true },
  ).select("-password");

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  await Notification.create({
    userId: user._id,
    title: isVerified
      ? "Verification Approved! 🛡️"
      : "Verification Rejected ⚠️",
    message: isVerified
      ? "Congratulations! You are now a verified LCU messenger."
      : `Your verification was rejected. Reason: ${reason || "No reason provided."}`,
    type: "verification_update",
    relatedId: user._id,
  });

  // Background email update
  sendVerificationEmail(user.email, user.name, status, reason).catch((err) =>
    console.error("Verification Email Error:", err),
  );

  await Log.create({
    adminId: req.admin.id,
    adminName: req.admin.name || "Admin",
    action: "VERIFY_USER",
    targetId: user._id.toString(),
    targetName: user.name,
    details: `Verification ${status}${reason ? ": " + reason : ""}`,
  });

  res.json({ message: `User verification ${status} successfully`, user });
});

export const getAllWithdrawals = catchAsync(async (req, res) => {
  const withdrawals = await WithdrawalRequest.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.json(withdrawals);
});

export const processWithdrawal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawal = await WithdrawalRequest.findById(id).session(session);
    if (!withdrawal) {
      await session.abortTransaction();
      res.status(404).json({ message: "Withdrawal request not found" });
      return;
    }

    if (withdrawal.status !== "pending") {
      await session.abortTransaction();
      res.status(400).json({ message: "Withdrawal is already processed" });
      return;
    }

    withdrawal.status = status;
    if (reason) withdrawal.rejectionReason = reason;
    withdrawal.processedAt = new Date();
    await withdrawal.save({ session });

    const user = await User.findById(withdrawal.userId).session(session);
    if (!user) {
      await session.abortTransaction();
      res.status(404).json({ message: "User not found" });
      return;
    }

    // CRITICAL: If rejected, refund the user's balance
    if (status === "rejected") {
      user.balance += withdrawal.amount;
      await user.save({ session });

      // Create refund transaction
      await Transaction.create(
        [
          {
            userId: user._id,
            amount: withdrawal.amount,
            type: "credit",
            description: `Refund: Withdrawal Rejected (${reason || "No reason provided"})`,
          },
        ],
        { session },
      );
    }

    await Notification.create(
      [
        {
          userId: withdrawal.userId,
          title:
            status === "approved"
              ? "Withdrawal Processed! 💸"
              : "Withdrawal Rejected ❌",
          message:
            status === "approved"
              ? `Your withdrawal of ₦${withdrawal.amount} has been processed and sent to your account.`
              : `Your withdrawal of ₦${withdrawal.amount} was rejected. Reason: ${reason}`,
          type: "withdrawal_update",
          relatedId: withdrawal._id,
        },
      ],
      { session },
    );

    await Log.create(
      [
        {
          adminId: req.admin.id,
          adminName: req.admin.name || "Admin",
          action: "PROCESS_WITHDRAWAL",
          targetId: withdrawal._id.toString(),
          targetName: user?.name || "Unknown User",
          details: `Withdrawal ${status} for ₦${withdrawal.amount}${reason ? ": " + reason : ""}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Background payouts notification (non-critical)
    sendPayoutNotification(
      user.email,
      user.name,
      status,
      withdrawal.amount,
    ).catch((err) => console.error("Payout Email Error:", err));

    res.json({ message: `Withdrawal ${status} successfully`, withdrawal });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});


export const getPendingVerifications = catchAsync(async (req, res) => {
  const users = await User.find({ verificationStatus: "pending" });
  res.json(users);
});

export const getHealthStatus = catchAsync(async (req, res) => {
  const dbStatus = User.db?.readyState === 1 ? "connected" : "disconnected";
  const dbName = User.db?.db?.databaseName || "unknown";

  res.json({
    database: dbStatus,
    databaseName: dbName,
    server: "online",
    uptime: process.uptime(),
    memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    environment: process.env.NODE_ENV || "production-isolated",
  });
});

export const getAllLogs = catchAsync(async (req, res) => {
  const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

export const getChatHistory = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const messages = await Message.find({ errandId })
    .populate("senderId", "name email")
    .sort({ createdAt: 1 });
  res.json(messages);
});

export const sendBroadcast = catchAsync(async (req, res) => {
  const { subject, message } = req.body;
  const users = await User.find({ isSuspended: false }).select("email name");

  // Fire-and-forget to prevent UI timeout
  res.json({ message: `Broadcast initiated for ${users.length} users` });

  (async () => {
    for (const user of users) {
      try {
        await sendBroadcastEmail(user.email, user.name, subject, message);
        await new Promise((r) => setTimeout(r, 500)); // Rate limit protection
      } catch (err) {
        console.error(`Broadcast error for ${user.email}`);
      }
    }

    await Log.create({
      adminId: req.admin.id,
      adminName: req.admin.name || "Admin",
      action: "BROADCAST_SENT",
      targetName: "Global",
      details: `Mass campaign "${subject}" complete.`,
    });
  })();
});
