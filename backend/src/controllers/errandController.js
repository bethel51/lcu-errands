import mongoose from "mongoose";
import { Errand } from "../models/Errand.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { sendErrandNotification } from "../utils/mailService.js";
import { Notification } from "../models/Notification.js";
import { catchAsync } from "./catchAsync.js";
import { DigitalFootprint } from "../models/DigitalFootprint.js";

const getRequestContext = (req, fallbackLocation = "Campus") => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : (forwardedFor || req.ip || req.socket?.remoteAddress || "127.0.0.1")
        .split(",")[0]
        .trim();

  return {
    ipAddress,
    deviceInfo: req.headers["user-agent"] || "Unknown Device",
    locationData:
      req.headers["x-client-location"] ||
      req.headers["x-user-location"] ||
      req.body?.locationData ||
      fallbackLocation,
  };
};

const updateDigitalFootprint = async ({
  errand,
  action,
  req,
  userId,
  actorName,
  actorRole,
  actionTitle,
  actionDescription,
  details,
  set = {},
  walletMovementLog,
  metadata,
  session,
}) => {
  const { ipAddress, deviceInfo } = getRequestContext(req);
  
  let finalActorName = actorName;
  let finalActorRole = actorRole;
  
  if (userId && (!finalActorName || !finalActorRole)) {
    try {
      const actorUser = await User.findById(userId);
      if (actorUser) {
        if (!finalActorName) finalActorName = actorUser.name;
        if (!finalActorRole) {
          finalActorRole = actorUser.role || (errand.posterId?.toString() === userId.toString() ? "sender" : "messenger");
        }
      }
    } catch (err) {
      console.error("Error resolving actor details for footprint log", err);
    }
  }

  const update = {
    $setOnInsert: {
      errandId: errand._id,
      senderId: errand.posterId,
      timePosted: errand.createdAt || new Date(),
    },
    $set: set,
    $push: {
      auditTrail: {
        action,
        timestamp: new Date(),
        userId,
        actorName: finalActorName || "System",
        actorRole: finalActorRole || "system",
        actionTitle: actionTitle || action,
        actionDescription: actionDescription || details,
        ipAddress,
        deviceInfo,
        details,
        metadata,
      },
    },
  };

  if (walletMovementLog) {
    update.$push.walletMovementLogs = {
      timestamp: new Date(),
      ...walletMovementLog,
    };
  }

  const footprint = await DigitalFootprint.findOneAndUpdate({ errandId: errand._id }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    ...(session ? { session } : {}),
  });

  // Real-time synchronization via WebSockets
  const io = req?.io;
  if (io) {
    const roomName = errand._id.toString();
    io.to(roomName).emit("footprint_updated", footprint);
    
    // Also notify users directly
    if (errand.posterId) {
      io.to(errand.posterId.toString()).emit("footprint_updated", footprint);
    }
    if (errand.erranderId) {
      io.to(errand.erranderId.toString()).emit("footprint_updated", footprint);
    }
    
    // Also emit to the admin room
    io.to("admin").emit("footprint_updated", footprint);
  }

  return footprint;
};

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

    const postedContext = getRequestContext(req, errand.dropoffLocation || "Campus");
    const user = await User.findById(userId);
    await DigitalFootprint.create({
      errandId: errand._id,
      senderId: userId,
      messengerId,
      timePosted: new Date(),
      deviceInfo: { posted: postedContext.deviceInfo },
      ipAddress: { posted: postedContext.ipAddress },
      locationData: { posted: postedContext.locationData },
      status: "held",
      auditTrail: [
        {
          action: "POSTED",
          timestamp: new Date(),
          userId,
          actorName: user?.name || "Sender",
          actorRole: "sender",
          actionTitle: "Direct Inquiry Created",
          actionDescription: "Direct inquiry created with digital footprint.",
          ipAddress: postedContext.ipAddress,
          deviceInfo: postedContext.deviceInfo,
          details: "Direct inquiry created with digital footprint.",
        },
      ],
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

  if (errand.status === "completed" || errand.status === "confirmed_completed" || errand.paymentReleased) {
    res.status(400).json({ message: "Errand is already completed and payment has been released" });
    return;
  }

  if (!["pending_confirmation", "pending_sender_confirmation"].includes(errand.status)) {
    res.status(400).json({ message: "Errand is not pending confirmation. The messenger must request completion first." });
    return;
  }

  if (!errand.erranderId) {
    res.status(400).json({ message: "Sender confirmation is not allowed because no messenger is assigned to this errand." });
    return;
  }

  const { proof } = req.body;
  try {
    const errander = await User.findById(errand.erranderId);
    if (!errander) {
      res.status(404).json({ message: "Assigned messenger not found" });
      return;
    }

    const previousBalance = errander.balance;
    errander.balance += errand.fee;
    await errander.save();

    let tx;
    try {
      // Log earnings transaction
      const created = await Transaction.create({
        userId: errander._id,
        amount: errand.fee,
        type: "errand_earning",
        description: `Payment for completed errand: ${errand.title}`,
        errandId: errand._id,
        senderId: errand.posterId,
        messengerId: errander._id,
        status: "completed",
      });
      tx = created;
    } catch (txErr) {
      // Rollback balance if transaction record fails
      errander.balance -= errand.fee;
      await errander.save();
      throw txErr;
    }

    errand.status = "confirmed_completed";
    errand.senderConfirmedAt = new Date();
    errand.paymentReleased = true;
    errand.paymentReleasedAt = new Date();
    errand.paymentTransactionId = tx._id.toString();
    if (proof) errand.completionProof = proof;
    await errand.save();

    // Capture user IP & Device info
    const confirmedContext = getRequestContext(req, errand.dropoffLocation || "Campus");
    const txRef = `TX-${tx._id}`;

    await updateDigitalFootprint({
      errand,
      action: "CONFIRMED",
      req,
      userId: req.user.id,
      actionTitle: "Payment Released ✅",
      actionDescription: `Sender confirmed delivery. ₦${errand.fee} released to messenger wallet.`,
      details: `Errand confirmation. Funds ₦${errand.fee} released to messenger wallet.`,
      set: {
        messengerId: errander._id,
        timeConfirmed: new Date(),
        "deviceInfo.confirmed": confirmedContext.deviceInfo,
        "ipAddress.confirmed": confirmedContext.ipAddress,
        "locationData.confirmed": confirmedContext.locationData,
        transactionReference: txRef,
        status: "released",
      },
      walletMovementLog: {
        userId: errander._id,
        action: "CREDIT_WALLET",
        amount: errand.fee,
        previousBalance,
        newBalance: errander.balance,
      },
    });

    // Fire notifications in parallel
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
        title: "Payment Released! ✅",
        message: `You confirmed delivery of "${errand.title}". Funds have been released to the messenger.`,
        type: "payment_released",
        relatedId: errand._id.toString(),
      },
      {
        userId: errand.erranderId ? errand.erranderId.toString() : null,
        title: "Wallet Credited! 💰",
        message: `Your payment for "${errand.title}" has been released to your wallet.`,
        type: "wallet_credited",
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
    throw error;
  }
});

export const getUserHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const errands = await Errand.find({
    $or: [{ posterId: userId }, { erranderId: userId }],
    hiddenBy: { $ne: userId }, // exclude entries the user has hidden
  })
    .populate("posterId", "name profilePicture phoneNumber rating isVerified email department location")
    .populate("erranderId", "name profilePicture phoneNumber rating isVerified email department location")
    .populate("candidates", "name profilePicture rating location department isVerified")
    .sort({ createdAt: -1 })
    .lean();

  res.json(errands);
});

// Permanently hide/delete an errand from a user's history view
export const deleteFromHistory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(id);
  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  const isPoster = errand.posterId.toString() === userId;
  const isMessenger = errand.erranderId?.toString() === userId;

  if (!isPoster && !isMessenger) {
    res.status(403).json({ message: "You are not authorized to remove this errand from your history" });
    return;
  }

  // If the Sender is deleting an active errand (not completed yet), refund them
  if (isPoster) {
    const isActive = ["open", "assigned", "in_progress", "pending_sender_confirmation", "pending_confirmation"].includes(errand.status);
    
    if (isActive) {
      const user = await User.findById(userId);
      if (user && errand.fee > 0) {
        user.balance += errand.fee;
        await user.save();
        await Transaction.create({ userId, amount: errand.fee, type: "credit", description: `Refund for cancelled errand: ${errand.title}`, errandId: errand._id });
      }
      await Errand.findByIdAndDelete(errand._id);
      res.json({ message: "Errand cancelled and permanently deleted. Funds refunded to your balance." });
      return;
    } else {
      // Completed or cancelled errand being deleted by poster - no refund, just delete
      await Errand.findByIdAndDelete(errand._id);
      res.json({ message: "Errand permanently deleted from your history." });
      return;
    }
  }

  // If it's the messenger doing the hiding, just hide it for them
  await Errand.findByIdAndUpdate(id, { $addToSet: { hiddenBy: userId } });
  res.json({ message: "Errand removed from your history." });
});

export const getErrandFootprint = catchAsync(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid Errand ID" });
    return;
  }

  let footprint = await DigitalFootprint.findOne({ errandId: id }).lean();
  if (!footprint) {
    const errand = await Errand.findById(id);
    if (!errand) {
      res.status(404).json({ message: "Errand not found" });
      return;
    }
    try {
      const created = await DigitalFootprint.create({
        errandId: errand._id,
        senderId: errand.posterId,
        messengerId: errand.erranderId || undefined,
        timePosted: errand.createdAt || new Date(),
        status: ["completed", "confirmed_completed"].includes(errand.status) ? "released" : "held",
        auditTrail: [
          {
            action: "POSTED",
            timestamp: errand.createdAt || new Date(),
            userId: errand.posterId,
            actorName: "Sender",
            actorRole: "sender",
            actionTitle: "Errand Posted",
            actionDescription: "Errand created.",
            details: "Digital footprint backfilled.",
          }
        ]
      });
      footprint = created.toObject();
    } catch (err) {
      console.error("Failed to auto-create footprint", err);
      footprint = {
        errandId: errand._id,
        senderId: errand.posterId,
        auditTrail: []
      };
    }
  }
  res.json(footprint);
});

export const createErrand = catchAsync(async (req, res) => {
  const posterId = req.user.id;
  const {
    title,
    description,
    category,
    pickupLocation,
    dropoffLocation,
    fee,
    erranderId,
  } = req.body;
  try {
    // Check if poster has sufficient balance
    const user = await User.findById(posterId);
    if (!user) {
      res.status(404).json({ message: "User account not found." });
      return;
    }
    if (user.balance < fee) {
      res.status(400).json({ message: "Insufficient wallet balance. Please top up." });
      return;
    }

    // Create the errand first
    const newErrand = await Errand.create({
      title,
      description,
      category,
      pickupLocation,
      dropoffLocation,
      fee,
      posterId,
      erranderId: erranderId || undefined,
      status: "open",
    });

    // Deduct balance from poster
    const previousBalance = user.balance;
    user.balance -= fee;
    await user.save();

    // Log the transaction
    await Transaction.create({
      userId: posterId,
      amount: fee,
      type: "debit",
      description: `Payment for errand: ${title}`,
      errandId: newErrand._id,
    });

    // Create digital footprint
    const context = getRequestContext(req, dropoffLocation || "Campus");
    const ipAddress = context.ipAddress;
    const deviceInfo = context.deviceInfo;

    await DigitalFootprint.create({
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
          previousBalance,
          newBalance: user.balance,
        },
      ],
      auditTrail: [
        {
          action: "POSTED",
          timestamp: new Date(),
          userId: posterId,
          actorName: user.name,
          actorRole: "sender",
          actionTitle: "Errand Posted",
          actionDescription: `Errand posted. ₦${fee} moved to Escrow.`,
          ipAddress,
          deviceInfo,
          details: `Errand posted. ₦${fee} moved to Escrow.`,
        },
      ],
    });

    // Notify the messenger if it's a direct hire, else broadcast
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
        if (io) io.to(erranderId.toString()).emit("notification", notificationData);
        const messenger = await User.findById(erranderId);
        if (messenger)
          sendErrandNotification(messenger.email, messenger.name, "requested", title).catch(console.error);
      };
      handleDirectHire();
    } else {
      if (io) io.emit("new_errand", newErrand);
    }

    res.status(201).json(newErrand);
  } catch (error) {
    throw error;
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
    "title description category fee pickupLocation dropoffLocation createdAt posterId erranderId status candidates",
  )
    .populate({
      path: "posterId",
      match: { isActive: true },
      select: "name rating profilePicture department location isVerified",
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
    .populate("posterId", "name rating profilePicture isVerified")
    .populate("erranderId", "name rating profilePicture isVerified")
    .populate("candidates", "name rating profilePicture isVerified department location")
    .lean();

  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  res.json(errand);
});

export const applyForErrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const erranderId = req.user.id;

  const existingErrand = await Errand.findById(id);

  if (!existingErrand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Check if the user is verified
  const user = await User.findById(erranderId);
  if (!user || !user.isVerified) {
    res.status(403).json({
      message: "Your account is not verified. Please contact admin for verification.",
    });
    return;
  }

  if (existingErrand.status !== "open") {
    res.status(400).json({ message: "Errand is no longer open for applications" });
    return;
  }

  if (existingErrand.posterId.toString() === erranderId) {
    res.status(400).json({ message: "You cannot apply for your own errand" });
    return;
  }

  // Check if already applied
  const erranderObjectId = new mongoose.Types.ObjectId(erranderId);
  if (existingErrand.candidates.some(c => c.toString() === erranderId)) {
    res.status(400).json({ message: "You have already requested to do this errand" });
    return;
  }

  const errand = await Errand.findByIdAndUpdate(
    id,
    { $addToSet: { candidates: erranderObjectId } },
    { new: true }
  ).populate("candidates", "name profilePicture rating location");

  // Send real-time notification to the poster
  const io = req.io;
  const notificationData = {
    userId: errand.posterId,
    title: "New Errand Application!",
    message: `${user.name} has requested to do your errand "${errand.title}".`,
    type: "errand_requested",
    relatedId: errand._id,
  };

  await Notification.create(notificationData);
  if (io) {
    io.to(errand.posterId.toString()).emit("notification", notificationData);
  }

  res.json(errand);
});

export const selectMessenger = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { messengerId } = req.body;
  const userId = req.user.id;

  if (!messengerId) {
    res.status(400).json({ message: "Messenger ID is required" });
    return;
  }

  const existingErrand = await Errand.findById(id);

  if (!existingErrand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Security: Only the poster can select a messenger
  if (existingErrand.posterId.toString() !== userId) {
    res.status(403).json({ message: "You are not authorized to assign this errand" });
    return;
  }

  if (existingErrand.status !== "open") {
    res.status(400).json({ message: "Errand is no longer open" });
    return;
  }

  // Check if candidate is in the list
  if (!existingErrand.candidates.some(c => c.toString() === messengerId)) {
    res.status(400).json({ message: "This messenger did not request to do this errand" });
    return;
  }

  const erranderObjectId = new mongoose.Types.ObjectId(messengerId);
  const errand = await Errand.findByIdAndUpdate(
    id,
    {
      $set: {
        erranderId: erranderObjectId,
        status: "assigned",
        acceptedAt: new Date(),
      }
    },
    { new: true }
  );

  // Capture user IP & Device info
  const acceptedContext = getRequestContext(req, errand.pickupLocation || "Campus");
  await updateDigitalFootprint({
    errand,
    action: "ACCEPTED",
    req,
    userId: messengerId,
    actionTitle: "Messenger Selected ✅",
    actionDescription: "Messenger selected by sender and assigned to the errand.",
    details: "Errand assigned to messenger.",
    set: {
      messengerId: erranderObjectId,
      timeAccepted: new Date(),
      "deviceInfo.accepted": acceptedContext.deviceInfo,
      "ipAddress.accepted": acceptedContext.ipAddress,
      "locationData.accepted": acceptedContext.locationData,
    },
  });

  // Fire background email notification
  const triggerAcceptedNotification = async () => {
    const messenger = await User.findById(messengerId);
    if (messenger) {
      sendErrandNotification(
        messenger.email,
        messenger.name,
        "requested",
        errand.title,
      ).catch(console.error);
    }
  };
  triggerAcceptedNotification();

  // Notify the messenger that they were selected
  const io = req.io;
  const notificationData = {
    userId: messengerId,
    title: "You've Been Selected! 🎉",
    message: `You have been selected to do the errand "${errand.title}".`,
    type: "errand_accepted",
    relatedId: errand._id,
  };

  await Notification.create(notificationData);
  if (io) {
    io.to(messengerId.toString()).emit("notification", notificationData);
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

  try {
    // Refund the poster
    const user = await User.findById(userId);
    if (user) {
      user.balance += errand.fee;
      await user.save();
      await Transaction.create({
        userId,
        amount: errand.fee,
        type: "credit",
        description: `Refund for cancelled errand: ${errand.title}`,
        errandId: errand._id,
      });
    }

    const footprint = await DigitalFootprint.findOneAndUpdate(
      { errandId: id },
      {
        $set: { status: "rejected" },
        $push: {
          auditTrail: {
            action: "REJECTED",
            timestamp: new Date(),
            userId,
            actorName: user?.name || "Sender",
            actorRole: "sender",
            actionTitle: "Errand Cancelled ❌",
            actionDescription: "Errand was cancelled by the sender and funds were refunded.",
            details: "Errand cancelled and funds refunded to user.",
          },
        },
      },
      { new: true }
    );
    if (footprint && req.io) {
      req.io.to(id.toString()).emit("footprint_updated", footprint);
      req.io.to("admin").emit("footprint_updated", footprint);
    }

    await Errand.findByIdAndDelete(id);
    res.json({ message: "Errand cancelled and funds refunded successfully" });
  } catch (error) {
    throw error;
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
  errand.status = "pending_sender_confirmation";
  errand.messengerCompletedAt = new Date();
  await errand.save();

  // Capture user IP & Device info
  const completedContext = getRequestContext(req, errand.dropoffLocation || "Campus");
  await updateDigitalFootprint({
    errand,
    action: "COMPLETED",
    req,
    userId,
    actionTitle: "Pending Confirmation ⏳",
    actionDescription: "Messenger marked the errand as completed. Awaiting sender confirmation.",
    details: "Errand marked completed by messenger.",
    set: {
      messengerId: errand.erranderId,
      timeCompleted: new Date(),
      "deviceInfo.completed": completedContext.deviceInfo,
      "ipAddress.completed": completedContext.ipAddress,
      "locationData.completed": completedContext.locationData,
    },
  });

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

export const startErrand = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(id);
  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  // Ensure only the assigned messenger can start the errand
  if (!errand.erranderId || errand.erranderId.toString() !== userId.toString()) {
    res.status(403).json({ message: "You are not the assigned messenger for this errand" });
    return;
  }

  if (errand.status !== "assigned") {
    res.status(400).json({ message: `Errand cannot be started (current status: ${errand.status}). It must be in assigned status.` });
    return;
  }

  errand.status = "in_progress";
  errand.startedAt = new Date();
  await errand.save();

  // Update digital footprint — wrapped in try/catch so a temporary DB issue
  // doesn't rollback the errand status update that already succeeded.
  try {
    const startedContext = getRequestContext(req, errand.pickupLocation || "Campus");
    await updateDigitalFootprint({
      errand,
      action: "STARTED",
      req,
      userId,
      actionTitle: "Errand Started 🚀",
      actionDescription: "Messenger has started working on the errand.",
      details: "Errand status changed to In Progress by messenger.",
      set: {
        messengerId: errand.erranderId,
        timeStarted: errand.startedAt,
      },
    });
  } catch (footprintErr) {
    console.error("[startErrand] Footprint update failed (non-critical):", footprintErr.message);
  }

  // Emit real-time update via socket
  const io = req?.io;
  if (io) {
    const notification = {
      type: "errand_started",
      errandId: errand._id,
      status: "in_progress",
      message: "Messenger has started the errand.",
    };
    if (errand.posterId) io.to(errand.posterId.toString()).emit("notification", notification);
    io.to(errand.erranderId.toString()).emit("notification", notification);
    io.to("admin").emit("notification", notification);
  }

  res.json({ message: "Errand started successfully! 🚀", status: errand.status });
});

export const uploadProof = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { imageUrl, text } = req.body;
  const userId = req.user.id;

  const errand = await Errand.findById(id);
  if (!errand) {
    res.status(404).json({ message: "Errand not found" });
    return;
  }

  if (errand.erranderId?.toString() !== userId) {
    res.status(403).json({ message: "You are not the assigned messenger for this errand" });
    return;
  }

  if (imageUrl) errand.completionProof = imageUrl;
  await errand.save();

  await updateDigitalFootprint({
    errand,
    action: "PROOF_UPLOADED",
    req,
    userId,
    actionTitle: "Proof Uploaded 📸",
    actionDescription: text || "Messenger uploaded delivery proof.",
    details: `Proof uploaded: ${imageUrl ? "Image attached" : "Text details provided"}.`,
    metadata: { imageUrl, text },
  });

  res.json({ message: "Proof uploaded successfully", proof: imageUrl });
});
