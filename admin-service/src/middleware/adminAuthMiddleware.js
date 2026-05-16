import jwt from "jsonwebtoken";

export const adminAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "No authorization token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res
      .status(401)
      .json({ message: "Invalid or expired administrative session" });
  }
};
