import { Message } from "../models/Message.js";
import { Errand } from "../models/Errand.js";
import { catchAsync } from "./catchAsync.js";

export const getMessagesForErrand = catchAsync(async (req, res) => {
  const { errandId } = req.params;
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

  // For each errand, get the last message
  const conversations = await Promise.all(
    errands.map(async (errand) => {
      const lastMessage = await Message.findOne({ errandId: errand._id })
        .sort({ createdAt: -1 })
        .lean();

      if (!lastMessage) return null; // Only show errands with at least one message

      return {
        errand,
        lastMessage,
      };
    }),
  );

  res.json(conversations.filter((c) => c !== null));
});
