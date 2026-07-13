import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["sender", "messenger", "admin"],
      default: "sender",
    },
    location: { type: String }, // e.g., 'Hostel A', 'Block B'
    department: { type: String },
    phoneNumber: { type: String, required: true },
    matricNumber: { type: String, unique: true },
    balance: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    profilePicture: { type: String },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isBoosted: { type: Boolean, default: false },
    boostUntil: { type: Date },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified"],
      default: "unverified",
    },
    verificationProof: { type: String }, // URL to ID card image
    verificationReason: { type: String },
    isSuspended: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isOnline: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ name: "text" }); // Enable text search on names

export const User = mongoose.model("User", userSchema);
