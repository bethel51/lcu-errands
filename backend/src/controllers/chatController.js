import { Message } from "../models/Message.js";
import { Errand } from "../models/Errand.js";
import { catchAsync } from "./catchAsync.js";

export const getMessagesForErrand = catchAsync(async (req, res) => {
  const { errandId } = req.params;
  const userId = req.user.id;

  const errand = await Errand.findById(errandId);
  if (!errand) {
    return res.status(404).json({ message: "Errand not found" });
  }

  // Security: Only participants can read messages
  if (
    errand.posterId.toString() !== userId &&
    errand.erranderId?.toString() !== userId
  ) {
    return res.status(403).json({ message: "You are not authorized to view these messages" });
  }

  // Mark all unread messages from the other party as read
  await Message.updateMany(
    { errandId, senderId: { $ne: userId }, isRead: false },
    { $set: { isRead: true } }
  );

  const messages = await Message.find({ errandId })
    .sort({ createdAt: 1 })
    .lean();

  res.json(messages);
});

export const getUserConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Find errands where user has sent a message
  const myMessages = await Message.find({ senderId: userId }).distinct(
    "errandId",
  );

  // Find errands where user is poster, errander, or has participated in chat
  const errands = await Errand.find({
    $or: [
      { posterId: userId },
      { erranderId: userId },
      { _id: { $in: myMessages } },
    ],
  })
    .populate("posterId", "name profilePicture")
    .populate("erranderId", "name profilePicture")
    .lean();

  // For each errand, get the last message and unread count
  const conversations = await Promise.all(
    errands.map(async (errand) => {
      const lastMessage = await Message.findOne({ errandId: errand._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!lastMessage) return null; // Only show errands with at least one message

      const unreadCount = await Message.countDocuments({
        errandId: errand._id,
        senderId: { $ne: userId },
        isRead: false,
      });

      return {
        errand,
        lastMessage,
        unreadCount,
      };
    }),
  );

  res.json(conversations.filter((c) => c !== null));
});
