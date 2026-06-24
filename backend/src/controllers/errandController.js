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

  if (errand.status === "completed") {
    res.status(400).json({ message: "Errand is already completed" });
    return;
  }

  if (errand.status !== "pending_confirmation") {
    res.status(400).json({ message: "Errand must be in pending_confirmation status for sender to confirm delivery." });
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
      session,
    });

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
        title: "Payment Released! ✅",
        message: `You confirmed delivery of "${errand.title}". Funds have been released to the messenger.`,
        type: "payment_released",
        relatedId: errand._id.toString(),
      },
      {
        userId: errand.erranderId ? errand.erranderId.toString() : null,
        title: "Wallet Credited! 💰",
        message: `₦${errand.fee} has been credited to your wallet for completing "${errand.title}".`,
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
              actorName: user.name,
              actorRole: "sender",
              actionTitle: "Errand Posted",
              actionDescription: `Errand posted. ₦${fee} moved to Escrow.`,
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

  const existingErrand = await Errand.findById(id);

  if (!existingErrand) {
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

  if (existingErrand.status !== "open") {
    res.status(400).json({ message: "Errand is no longer available" });
    return;
  }

  if (existingErrand.posterId.toString() === erranderId) {
    res.status(400).json({ message: "You cannot accept your own errand" });
    return;
  }

  // Security: If this errand was directly requested to a specific messenger, only they can accept it
  if (existingErrand.erranderId && existingErrand.erranderId.toString() !== erranderId) {
    res
      .status(403)
      .json({
        message:
          "This errand is exclusively requested to a different messenger",
      });
    return;
  }

  const erranderObjectId = new mongoose.Types.ObjectId(erranderId);
  const errand = await Errand.findOneAndUpdate(
    {
      _id: id,
      status: "open",
      posterId: { $ne: erranderObjectId },
      $or: [
        { erranderId: { $exists: false } },
        { erranderId: null },
        { erranderId: erranderObjectId },
      ],
    },
    {
      $set: {
        erranderId: erranderObjectId,
        status: "assigned",
      },
    },
    { new: true }
  );

  if (!errand) {
    res.status(409).json({ message: "Errand is no longer available" });
    return;
  }

  // Capture user IP & Device info
  const acceptedContext = getRequestContext(req, errand.pickupLocation || "Campus");
  await updateDigitalFootprint({
    errand,
    action: "ACCEPTED",
    req,
    userId: erranderId,
    actionTitle: "Messenger Accepted ✅",
    actionDescription: "Errand accepted and assigned to messenger.",
    details: "Errand accepted by messenger.",
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

    const footprint = await DigitalFootprint.findOneAndUpdate(
      { errandId: id },
      {
        $set: { status: "rejected" },
        $push: {
          auditTrail: {
            action: "REJECTED",
            timestamp: new Date(),
            userId: userId,
            actorName: user?.name || "Sender",
            actorRole: "sender",
            actionTitle: "Errand Cancelled ❌",
            actionDescription: "Errand was cancelled by the sender and funds were refunded.",
            details: "Errand cancelled and funds refunded to user.",
          },
        },
      },
      { session, new: true }
    );
    if (footprint && req.io) {
      req.io.to(id.toString()).emit("footprint_updated", footprint);
      req.io.to("admin").emit("footprint_updated", footprint);
    }

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

  if (errand.erranderId?.toString() !== userId) {
    res.status(403).json({ message: "You are not the assigned messenger for this errand" });
    return;
  }

  if (errand.status !== "assigned") {
    res.status(400).json({ message: "Errand must be in assigned status to start it." });
    return;
  }

  errand.status = "in_progress";
  await errand.save();

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
      "deviceInfo.accepted": startedContext.deviceInfo,
    },
  });

  res.json({ message: "Errand started successfully", status: errand.status });
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

export const getErrandFootprint = catchAsync(async (req, res) => {
  const { id } = req.params;
  const footprint = await DigitalFootprint.findOne({ errandId: id }).lean();
  if (!footprint) {
    const errand = await Errand.findById(id);
    if (!errand) {
      res.status(404).json({ message: "Errand not found" });
      return;
    }
    const newFootprint = await DigitalFootprint.create({
      errandId: errand._id,
      senderId: errand.posterId,
      messengerId: errand.erranderId,
      timePosted: errand.createdAt,
      status: errand.status === "completed" ? "released" : "held",
      auditTrail: [
        {
          action: "POSTED",
          timestamp: errand.createdAt,
          userId: errand.posterId,
          actionTitle: "Errand Posted",
          actionDescription: "Errand created.",
          details: "Digital footprint backfilled.",
        }
      ]
    });
    res.json(newFootprint);
    return;
  }
  res.json(footprint);
});

