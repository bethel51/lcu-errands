import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    securityKey: { type: String, required: true }, // Extra layer of security
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

export const Admin = mongoose.model("Admin", adminSchema);
