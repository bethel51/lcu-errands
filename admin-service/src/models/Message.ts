import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Interface representing a Message document in MongoDB
 */
export interface IMessage extends Document {
  errandId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string;
  imageUrl?: string;
  createdAt: Date;
}

/**
 * Mongoose Schema for the Message model
 */
const messageSchema: Schema<IMessage> = new Schema(
  {
    errandId: {
      type: Schema.Types.ObjectId,
      ref: "Errand",
      required: [true, "Errand ID is required"],
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    text: {
      type: String,
      trim: true,
      required: false,
    },
    imageUrl: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Handled manually with createdAt default
    versionKey: false,
  }
);

// Compound index for faster queries on specific errands
messageSchema.index({ errandId: 1, createdAt: 1 });

/**
 * Message Model
 */
export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", messageSchema);
