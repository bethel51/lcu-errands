import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { catchAsync } from "./catchAsync";

export const adminLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  // Only allow users with the admin role
  if (user.role !== "admin") {
    res.status(403).json({ message: "Access denied. Admin accounts only." });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ message: "This admin account has been suspended." });
    return;
  }

  if (!user.isActive) {
    res
      .status(403)
      .json({ message: "This admin account has been deactivated." });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

  const token = jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: "8h",
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const adminLogout = catchAsync(async (req, res) => {
  // JWT is stateless; logout is handled client-side by discarding the token.
  // This endpoint exists as a clean contract for the admin frontend.
  res.json({ message: "Logged out successfully" });
});
