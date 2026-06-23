import mongoose from "mongoose";
import { Errand } from "../models/Errand.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { sendErrandNotification } from "../utils/mailService.js";
import { Notification } from "../models/Notification.js";
import { catchAsync } from "./catchAsync.js";
import { DigitalFootprint } from "../models/DigitalFootprint.js";

export const createInquiry = catchAsync(async (req, res) => {
  const { messengerId } = req.body;
  if (!messengerId) {
    res.status(400).json({ message: "Messenger ID is required" });
    return;
  }
  const userId = req.user.id;

  // Check if an inquiry errand already exists between these two
  let errand = await Errand.findOne({
    posterId: userId,
    erranderId: messengerId,
    status: "open",
    title: "Direct Inquiry",
  });

  if (!errand) {
    errand = await Errand.create({
      title: "Direct Inquiry",
      description: "Conversation about potential errands.",
      fee: 0,
      category: "Academic",
      pickupLocation: "Campus",
      dropoffLocation: "Campus",
      posterId: userId,
      erranderId: messengerId,
      status: "open",
    });
  }

  res.json(errand);
});

export const completeErrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(id);

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Security: Only the poster can complete the errand
  if (errand.posterId.toString() !== userId) {
    res
      .status(403)
      .json({ message: "You are not authorized to complete this errand" });
    return;
  }

  if (errand.status === "completed") {
    res.status(400).json({ message: "Errand is already completed" });
    return;
  }

  const { proof } = req.body;
  const errander = await User.findById(errand.erranderId);

  if (!errander) {
    res.status(404).json({ message: "Assigned messenger not found" });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const previousBalance = errander.balance;
    errander.balance += errand.fee;
    await errander.save({ session });

    // Log earnings transaction
    const [tx] = await Transaction.create(
      [
        {
          userId: errander._id,
          amount: errand.fee,
          type: "credit",
          description: `Earnings from Errand: ${errand.title}`,
          errandId: errand._id,
        },
      ],
      { session },
    );

    errand.status = "completed";
    if (proof) errand.completionProof = proof;
    await errand.save({ session });

    // Capture user IP & Device info
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";
    const txRef = `TX-${tx._id}`;

    await DigitalFootprint.findOneAndUpdate(
      { errandId: errand._id },
      {
        $set: {
          timeConfirmed: new Date(),
          "deviceInfo.confirmed": deviceInfo,
          "ipAddress.confirmed": ipAddress,
          "locationData.confirmed": errand.dropoffLocation || "Campus",
          transactionReference: txRef,
          status: "released",
        },
        $push: {
          walletMovementLogs: {
            timestamp: new Date(),
            userId: errander._id,
            action: "CREDIT_WALLET",
            amount: errand.fee,
            previousBalance: previousBalance,
            newBalance: errander.balance,
          },
          auditTrail: {
            action: "CONFIRMED",
            timestamp: new Date(),
            userId: req.user.id,
            ipAddress,
            deviceInfo,
            details: `Errand confirmation. Funds ₦${errand.fee} released to messenger wallet.`,
          },
        },
      },
      { session }
    );

    await session.commitTransaction();

    // Fire notifications in parallel after successful commit
    const triggerNotifications = async () => {
      const poster = await User.findById(errand.posterId);
      if (poster) {
        sendErrandNotification(
          poster.email,
          poster.name,
          "completed",
          errand.title,
        ).catch(console.error);
      }
      sendErrandNotification(
        errander.email,
        errander.name,
        "completed_errander",
        errand.title,
      ).catch(console.error);
    };
    triggerNotifications();

    // Notify both parties that the errand is complete
    const io = req.io;
    const notifications = [
      {
        userId: errand.posterId.toString(),
        title: "Errand Completed!",
        message: `The errand "${errand.title}" is now complete.`,
        type: "errand_completed",
        relatedId: errand._id.toString(),
      },
      {
        userId: errand.erranderId ? errand.erranderId.toString() : null,
        title: "Errand Completed!",
        message: `The errand "${errand.title}" is now complete.`,
        type: "errand_completed",
        relatedId: errand._id.toString(),
      },
    ];

    await Notification.insertMany(notifications);

    if (io) {
      notifications.forEach((n) => {
        if (n.userId) {
          io.to(n.userId).emit("notification", n);
        }
      });
    }

    res.json(errand);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const getUserHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const errands = await Errand.find({
    $or: [{ posterId: userId }, { erranderId: userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json(errands);
});

export const createErrand = catchAsync(async (req, res) => {
  const {
    title,
    description,
    category,
    pickupLocation,
    dropoffLocation,
    fee,
    erranderId,
  } = req.body;
  const posterId = req.user.id;
  // Check if poster has sufficient balance
  const user = await User.findById(posterId);
  if (!user || user.balance < fee) {
    res
      .status(400)
      .json({ message: "Insufficient wallet balance. Please top up." });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [newErrand] = await Errand.create(
      [
        {
          title,
          description,
          category,
          pickupLocation,
          dropoffLocation,
          fee,
          posterId,
          erranderId: erranderId || undefined,
          status: "open",
        },
      ],
      { session },
    );

    // Deduct balance from poster and create transaction
    user.balance -= fee;
    await user.save({ session });

    await Transaction.create(
      [
        {
          userId: posterId,
          amount: fee,
          type: "debit",
          description: `Payment for errand: ${title}`,
          errandId: newErrand._id,
        },
      ],
      { session },
    );

    const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";

    await DigitalFootprint.create(
      [
        {
          errandId: newErrand._id,
          senderId: posterId,
          timePosted: new Date(),
          deviceInfo: { posted: deviceInfo },
          ipAddress: { posted: ipAddress },
          locationData: { posted: dropoffLocation || "Campus" },
          status: "held",
          walletMovementLogs: [
            {
              timestamp: new Date(),
              userId: posterId,
              action: "DEBIT_ESCROW",
              amount: fee,
              previousBalance: user.balance + fee,
              newBalance: user.balance,
            },
          ],
          auditTrail: [
            {
              action: "POSTED",
              timestamp: new Date(),
              userId: posterId,
              ipAddress,
              deviceInfo,
              details: `Errand posted. ₦${fee} moved to Escrow.`,
            },
          ],
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Notify the messenger if it's a direct hire, else notify all
    const io = req.io;
    if (erranderId) {
      const handleDirectHire = async () => {
        const notificationData = {
          userId: erranderId,
          title: "New Errand Request!",
          message: `You have a new direct errand request: "${title}"`,
          type: "errand_requested",
          relatedId: newErrand._id,
        };

        await Notification.create(notificationData);
        if (io)
          io.to(erranderId.toString()).emit("notification", notificationData);

        const messenger = await User.findById(erranderId);
        if (messenger)
          sendErrandNotification(
            messenger.email,
            messenger.name,
            "requested",
            title,
          ).catch(console.error);
      };
      handleDirectHire();
    } else {
      if (io) {
        io.emit("new_errand", newErrand);
      }
    }

    res.status(201).json(newErrand);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const getErrands = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Find errands that are either completely open, OR directed specifically at this messenger
  // AND the poster is still active
  const query = {
    status: "open",
    $or: [{ erranderId: { $exists: false } }],
  };

  if (userId) {
    query.$or.push({ erranderId: userId });
  }

  const errands = await Errand.find(
    query,
    "title description category fee pickupLocation dropoffLocation createdAt posterId erranderId status",
  )
    .populate({
      path: "posterId",
      match: { isActive: true },
      select: "name rating profilePicture",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Filter out errands where posterId was nullified by the 'match' in populate
  const activeErrands = errands.filter((e) => e.posterId);
  res.json(activeErrands);
});

export const getErrandById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const errand = await Errand.findById(id)
    .populate("posterId", "name rating profilePicture")
    .populate("erranderId", "name rating profilePicture")
    .lean();

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  res.json(errand);
});

export const acceptErrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const erranderId = req.user.id;

  const errand = await Errand.findById(id);

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Check if the user is verified
  const user = await User.findById(erranderId);
  if (!user || !user.isVerified) {
    res
      .status(403)
      .json({
        message:
          "Your account is not verified. Please contact admin for verification.",
      });
    return;
  }

  if (errand.status !== "open") {
    res.status(400).json({ message: "Errand is no longer available" });
    return;
  }

  if (errand.posterId.toString() === erranderId) {
    res.status(400).json({ message: "You cannot accept your own errand" });
    return;
  }

  // Security: If this errand was directly requested to a specific messenger, only they can accept it
  if (errand.erranderId && errand.erranderId.toString() !== erranderId) {
    res
      .status(403)
      .json({
        message:
          "This errand is exclusively requested to a different messenger",
      });
    return;
  }

  errand.erranderId = new mongoose.Types.ObjectId(erranderId);
  errand.status = "in_progress";
  await errand.save();

  // Capture user IP & Device info
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const deviceInfo = req.headers["user-agent"] || "Unknown Device";

  await DigitalFootprint.findOneAndUpdate(
    { errandId: errand._id },
    {
      $set: {
        messengerId: erranderId,
        timeAccepted: new Date(),
        "deviceInfo.accepted": deviceInfo,
        "ipAddress.accepted": ipAddress,
        "locationData.accepted": errand.pickupLocation || "Campus",
      },
      $push: {
        auditTrail: {
          action: "ACCEPTED",
          timestamp: new Date(),
          userId: erranderId,
          ipAddress,
          deviceInfo,
          details: "Errand accepted by messenger.",
        },
      },
    },
    { new: true, upsert: true }
  ).catch(console.error);

  // Fire background email notification
  const triggerAcceptedNotification = async () => {
    const poster = await User.findById(errand.posterId);
    if (poster) {
      sendErrandNotification(
        poster.email,
        poster.name,
        "accepted",
        errand.title,
      ).catch(console.error);
    }
  };
  triggerAcceptedNotification();

  // Notify the poster that their errand was accepted
  const io = req.io;
  const notificationData = {
    userId: errand.posterId,
    title: "Errand Accepted!",
    message: `Your errand "${errand.title}" has been accepted.`,
    type: "errand_accepted",
    relatedId: errand._id,
  };

  await Notification.create(notificationData);
  if (io) {
    io.to(errand.posterId.toString()).emit("notification", notificationData);
  }

  res.json(errand);
});

export const deleteErrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(id);

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Security: Only the poster can delete the errand
  if (errand.posterId.toString() !== userId) {
    res
      .status(403)
      .json({ message: "You are not authorized to delete this errand" });
    return;
  }

  // Only allow deletion if the errand is still 'open' (not accepted by anyone)
  if (errand.status !== "open") {
    res
      .status(400)
      .json({
        message:
          "Cannot delete an errand that has already been accepted or completed",
      });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Refund the poster
    const user = await User.findById(userId).session(session);
    if (user) {
      user.balance += errand.fee;
      await user.save({ session });

      await Transaction.create(
        [
          {
            userId: userId,
            amount: errand.fee,
            type: "credit",
            description: `Refund for cancelled errand: ${errand.title}`,
            errandId: errand._id,
          },
        ],
        { session }
      );
    }

    await DigitalFootprint.findOneAndUpdate(
      { errandId: id },
      {
        $set: { status: "rejected" },
        $push: {
          auditTrail: {
            action: "REJECTED",
            timestamp: new Date(),
            userId: userId,
            details: "Errand cancelled and funds refunded to user.",
          },
        },
      },
      { session }
    ).catch(console.error);

    await Errand.findByIdAndDelete(id).session(session);
    
    await session.commitTransaction();
    res.json({ message: "Errand cancelled and funds refunded successfully" });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const requestCompletion = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(id);
  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Security: Only the assigned messenger can request completion
  if (errand.erranderId?.toString() !== userId) {
    res.status(403).json({ message: "You are not the assigned messenger for this errand" });
    return;
  }

  if (errand.status !== "in_progress" && errand.status !== "assigned") {
    res.status(400).json({ message: "Errand must be in progress status to request completion" });
    return;
  }

  errand.completionRequested = true;
  errand.status = "pending_confirmation";
  await errand.save();

  // Capture user IP & Device info
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const deviceInfo = req.headers["user-agent"] || "Unknown Device";

  await DigitalFootprint.findOneAndUpdate(
    { errandId: errand._id },
    {
      $set: {
        timeCompleted: new Date(),
        "deviceInfo.completed": deviceInfo,
        "ipAddress.completed": ipAddress,
        "locationData.completed": errand.dropoffLocation || "Campus",
      },
      $push: {
        auditTrail: {
          action: "COMPLETED",
          timestamp: new Date(),
          userId: userId,
          ipAddress,
          deviceInfo,
          details: "Errand marked completed by messenger.",
        },
      },
    },
    { new: true, upsert: true }
  ).catch(console.error);

  // Notify the poster
  const notificationData = {
    userId: errand.posterId.toString(),
    title: "Errand Delivery Pending! 📦",
    message: `The messenger has marked your errand "${errand.title}" as completed. Please confirm delivery to release funds.`,
    type: "errand_delivered",
    relatedId: errand._id.toString(),
  };

  await Notification.create(notificationData);

  const io = req.io;
  if (io) {
    io.to(errand.posterId.toString()).emit("notification", notificationData);
  }

  // Send email to poster
  const poster = await User.findById(errand.posterId);
  if (poster) {
    sendErrandNotification(
      poster.email,
      poster.name,
      "completed", // This notifies the poster to log in and confirm
      errand.title
    ).catch(console.error);
  }

  res.json({ message: "Completion request sent to poster successfully" });
});
