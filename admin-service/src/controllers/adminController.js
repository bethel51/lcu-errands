import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { Notification } from "../models/Notification.js";
import { Message } from "../models/Message.js";
import { DigitalFootprint } from "../models/DigitalFootprint.js";
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
  const totalActiveErrands = await Errand.countDocuments({
    status: { $in: ["open", "assigned", "in_progress", "pending_confirmation"] },
  });
  const pendingConfirmations = await Errand.countDocuments({ status: "pending_confirmation" });
  const flaggedErrands = await DigitalFootprint.countDocuments({ isSuspicious: true });
  const failedErrands = await Errand.countDocuments({ status: "cancelled" });

  const disputes = await DigitalFootprint.countDocuments({
    $or: [{ isSuspicious: true }, { status: "frozen" }]
  });

  // Calculate activities count
  const totalActivitiesResult = await DigitalFootprint.aggregate([
    { $project: { auditTrailSize: { $size: { $ifNull: ["$auditTrail", []] } } } },
    { $group: { _id: null, total: { $sum: "$auditTrailSize" } } }
  ]);
  const totalActivities = totalActivitiesResult[0]?.total || 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const activitiesTodayResult = await DigitalFootprint.aggregate([
    { $unwind: "$auditTrail" },
    { $match: { "auditTrail.timestamp": { $gte: startOfToday } } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);
  const activitiesToday = activitiesTodayResult[0]?.count || 0;

  // Total funds held in escrow (open/in-progress errands)
  const pendingPaymentsResult = await Errand.aggregate([
    { $match: { status: { $in: ["assigned", "in_progress", "pending_confirmation"] } } },
    { $group: { _id: null, total: { $sum: "$fee" } } },
  ]);
  const pendingPayments = pendingPaymentsResult[0]?.total || 0;

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
    totalActiveErrands,
    pendingConfirmations,
    pendingPayments,
    flaggedErrands,
    failedErrands,
    disputes,
    totalActivities,
    activitiesToday,
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
    .populate("posterId", "name email department location")
    .populate("erranderId", "name email")
    .sort({ createdAt: -1 });
  res.json(errands);
});

export const getErrandIntel = catchAsync(async (req, res) => {
  const { errandId } = req.params;

  const errand = await Errand.findById(errandId)
    .populate("posterId", "name email profilePicture department location rating phoneNumber")
    .populate("erranderId", "name email profilePicture rating location phoneNumber")
    .lean();

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  const messages = await Message.find({ errandId })
    .populate("senderId", "name profilePicture")
    .sort({ createdAt: 1 })
    .lean();

  let footprint = await DigitalFootprint.findOne({ errandId }).lean();
  if (!footprint) {
    footprint = await DigitalFootprint.create({
      errandId: errand._id,
      senderId: errand.posterId?._id || errand.posterId,
      messengerId: errand.erranderId?._id || errand.erranderId,
      timePosted: errand.createdAt || new Date(),
      timeAccepted: ["in_progress", "pending_confirmation", "completed"].includes(errand.status)
        ? errand.updatedAt || errand.createdAt
        : undefined,
      timeCompleted: ["pending_confirmation", "completed"].includes(errand.status)
        ? errand.updatedAt || errand.createdAt
        : undefined,
      timeConfirmed: errand.status === "completed" ? errand.updatedAt || errand.createdAt : undefined,
      locationData: {
        posted: errand.dropoffLocation || "Campus",
        accepted: errand.pickupLocation || "Campus",
        completed: errand.dropoffLocation || "Campus",
        confirmed: errand.dropoffLocation || "Campus",
      },
      status: errand.status === "completed" ? "released" : "held",
      auditTrail: [
        {
          action: "POSTED",
          timestamp: errand.createdAt || new Date(),
          userId: errand.posterId?._id || errand.posterId,
          details: "Digital footprint backfilled from the errand record for admin review.",
        },
      ],
    }).then((doc) => doc.toObject());
  }

  res.json({ errand, messages, footprint });
});

export const approveErrandTransaction = catchAsync(async (req, res) => {
  const { errandId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errand = await Errand.findById(errandId).session(session);
    if (!errand) {
      await session.abortTransaction();
      res.status(404).json({ message: "Errand not found" });
      return;
    }

    if (errand.status === "completed") {
      await session.abortTransaction();
      res.status(400).json({ message: "Errand is already completed" });
      return;
    }

    const messenger = await User.findById(errand.erranderId).session(session);
    if (!messenger) {
      await session.abortTransaction();
      res.status(404).json({ message: "Messenger not found" });
      return;
    }

    const previousBalance = messenger.balance;
    messenger.balance += errand.fee;
    await messenger.save({ session });

    await Transaction.create(
      [{ userId: messenger._id, amount: errand.fee, type: "credit", description: `Admin-approved: Earnings from Errand: ${errand.title}`, errandId: errand._id }],
      { session }
    );

    errand.status = "completed";
    await errand.save({ session });

    const txRef = `ADMIN-TX-${Date.now()}`;
    await DigitalFootprint.findOneAndUpdate(
      { errandId: errand._id },
      {
        $set: { status: "released", transactionReference: txRef, timeConfirmed: new Date() },
        $push: {
          walletMovementLogs: { timestamp: new Date(), userId: messenger._id, action: "RELEASE_FUNDS", amount: errand.fee, previousBalance, newBalance: messenger.balance },
          auditTrail: {
            action: "APPROVED",
            timestamp: new Date(),
            userId: req.admin.id,
            actorName: req.admin.name || "Admin",
            actorRole: "admin",
            actionTitle: "Admin Approved ✅",
            actionDescription: `Admin approved transaction and released ₦${errand.fee} to messenger wallet.`,
            details: `Admin approved and released ₦${errand.fee} to messenger wallet.`,
          },
        },
      },
      { session }
    );

    await Notification.create(
      [
        { userId: errand.posterId, title: "Payment Released ✅", message: `Admin has confirmed and released payment for "${errand.title}".`, type: "payment_released", relatedId: errand._id },
        { userId: errand.erranderId, title: "Wallet Credited 💰", message: `₦${errand.fee} has been credited to your wallet for "${errand.title}".`, type: "wallet_credited", relatedId: errand._id },
      ],
      { session }
    );

    await Log.create([{ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: "APPROVE_ERRAND_TRANSACTION", targetId: errand._id.toString(), targetName: errand.title, details: `Transaction approved. ₦${errand.fee} released to messenger.` }], { session });

    await session.commitTransaction();
    res.json({ message: "Transaction approved and funds released successfully" });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const rejectErrandTransaction = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const { reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const errand = await Errand.findById(errandId).session(session);
    if (!errand) {
      await session.abortTransaction();
      res.status(404).json({ message: "Errand not found" });
      return;
    }

    const poster = await User.findById(errand.posterId).session(session);
    if (poster) {
      poster.balance += errand.fee;
      await poster.save({ session });
      await Transaction.create(
        [{ userId: poster._id, amount: errand.fee, type: "credit", description: `Admin refund for rejected errand: ${errand.title}`, errandId: errand._id }],
        { session }
      );
    }

    errand.status = "cancelled";
    await errand.save({ session });

    await DigitalFootprint.findOneAndUpdate(
      { errandId: errand._id },
      {
        $set: { status: "rejected" },
        $push: {
          auditTrail: {
            action: "REJECTED",
            timestamp: new Date(),
            userId: req.admin.id,
            actorName: req.admin.name || "Admin",
            actorRole: "admin",
            actionTitle: "Admin Cancelled ❌",
            actionDescription: `Admin rejected transaction and refunded funds. Reason: ${reason || "N/A"}`,
            details: reason || "Admin rejected transaction. Funds refunded to sender.",
          },
        },
      },
      { session }
    );

    await Notification.create(
      [
        { userId: errand.posterId, title: "Transaction Rejected ❌", message: `Admin rejected the transaction for "${errand.title}". Your funds have been refunded.`, type: "payment_released", relatedId: errand._id },
      ],
      { session }
    );

    await Log.create([{ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: "REJECT_ERRAND_TRANSACTION", targetId: errand._id.toString(), targetName: errand.title, details: `Transaction rejected. Reason: ${reason || "N/A"}` }], { session });

    await session.commitTransaction();
    res.json({ message: "Transaction rejected and funds refunded to sender" });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const toggleErrandSuspicious = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const footprint = await DigitalFootprint.findOne({ errandId });
  if (!footprint) {
    res.status(404).json({ message: "Digital footprint not found for this errand" });
    return;
  }
  footprint.isSuspicious = !footprint.isSuspicious;
  footprint.auditTrail.push({
    action: "FLAGGED",
    timestamp: new Date(),
    userId: req.admin.id,
    actorName: req.admin.name || "Admin",
    actorRole: "admin",
    actionTitle: footprint.isSuspicious ? "Errand Flagged ⚠️" : "Errand Unflagged ✅",
    actionDescription: `Admin ${req.admin.name || "Admin"} ${footprint.isSuspicious ? "flagged" : "unflagged"} this errand as suspicious.`,
    details: `Admin ${footprint.isSuspicious ? "flagged" : "unflagged"} this errand as suspicious.`,
  });
  await footprint.save();

  await Log.create({ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: footprint.isSuspicious ? "FLAG_ERRAND" : "UNFLAG_ERRAND", targetId: errandId, details: `Errand ${footprint.isSuspicious ? "flagged" : "unflagged"} as suspicious.` });

  res.json({ message: `Errand ${footprint.isSuspicious ? "flagged" : "unflagged"} successfully`, isSuspicious: footprint.isSuspicious });
});

export const freezeErrandFunds = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const footprint = await DigitalFootprint.findOneAndUpdate(
    { errandId },
    {
      $set: { status: "frozen", isSuspicious: true },
      $push: {
        auditTrail: {
          action: "FROZEN",
          timestamp: new Date(),
          userId: req.admin.id,
          actorName: req.admin.name || "Admin",
          actorRole: "admin",
          actionTitle: "Funds Frozen ❄️",
          actionDescription: "Admin froze the errand funds pending dispute resolution.",
          details: "Admin froze funds pending investigation.",
        },
      },
    },
    { new: true }
  );

  if (!footprint) {
    res.status(404).json({ message: "Digital footprint not found for this errand" });
    return;
  }

  await Log.create({ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: "FREEZE_FUNDS", targetId: errandId, details: "Errand funds frozen by admin." });

  res.json({ message: "Funds frozen successfully" });
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
    title: isVerified ? "Verification Approved! 🛡️" : "Verification Rejected ⚠️",
    message: isVerified
      ? "Congratulations! You are now a verified LCU messenger."
      : `Your verification was rejected. Reason: ${reason || "No reason provided."}`,
    type: "verification_update",
    relatedId: user._id,
  });

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

    if (status === "rejected") {
      user.balance += withdrawal.amount;
      await user.save({ session });
      await Transaction.create(
        [{ userId: user._id, amount: withdrawal.amount, type: "credit", description: `Refund: Withdrawal Rejected (${reason || "No reason provided"})` }],
        { session },
      );
    }

    await Notification.create(
      [
        {
          userId: withdrawal.userId,
          title: status === "approved" ? "Withdrawal Processed! 💸" : "Withdrawal Rejected ❌",
          message: status === "approved"
            ? `Your withdrawal of ₦${withdrawal.amount} has been processed and sent to your account.`
            : `Your withdrawal of ₦${withdrawal.amount} was rejected. Reason: ${reason}`,
          type: status === "approved" ? "withdrawal_approved" : "withdrawal_rejected",
          relatedId: withdrawal._id,
        },
      ],
      { session },
    );

    await Log.create(
      [{ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: "PROCESS_WITHDRAWAL", targetId: withdrawal._id.toString(), targetName: user?.name || "Unknown User", details: `Withdrawal ${status} for ₦${withdrawal.amount}${reason ? ": " + reason : ""}` }],
      { session },
    );

    await session.commitTransaction();

    sendPayoutNotification(user.email, user.name, status, withdrawal.amount).catch((err) => console.error("Payout Email Error:", err));

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
  res.json({ database: dbStatus, databaseName: dbName, server: "online", uptime: process.uptime(), memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, environment: process.env.NODE_ENV || "production-isolated" });
});

export const getAllLogs = catchAsync(async (req, res) => {
  const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

export const getChatHistory = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const messages = await Message.find({ errandId })
    .populate("senderId", "name email profilePicture")
    .sort({ createdAt: 1 });
  res.json(messages);
});

export const getUserWithdrawalEvidence = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const completedErrands = await Errand.find({ erranderId: userId, status: "completed" })
    .populate("posterId", "name email")
    .populate("erranderId", "name email")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const evidence = await Promise.all(
    completedErrands.map(async (errand) => {
      const messages = await Message.find({ errandId: errand._id })
        .populate("senderId", "name email")
        .sort({ createdAt: 1 })
        .lean();
      return { errand, messages, hasProof: !!errand.completionProof, messageCount: messages.length };
    }),
  );
  res.json(evidence);
});

export const sendBroadcast = catchAsync(async (req, res) => {
  const { subject, message } = req.body;
  const users = await User.find({ isSuspended: false }).select("email name");
  res.json({ message: `Broadcast initiated for ${users.length} users` });

  (async () => {
    for (const user of users) {
      try {
        await sendBroadcastEmail(user.email, user.name, subject, message);
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`Broadcast error for ${user.email}`);
      }
    }
    await Log.create({ adminId: req.admin.id, adminName: req.admin.name || "Admin", action: "BROADCAST_SENT", targetName: "Global", details: `Mass campaign "${subject}" complete.` });
  })();
});

export const getAllFootprints = catchAsync(async (req, res) => {
  const footprints = await DigitalFootprint.find()
    .populate("errandId", "title status fee trackingId")
    .populate("senderId", "name email")
    .populate("messengerId", "name email")
    .sort({ updatedAt: -1 });
  res.json(footprints);
});

