import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  errandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Errand",
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: false,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export const Message = mongoose.model("Message", messageSchema);
