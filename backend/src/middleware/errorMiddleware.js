export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const status = err.status || "error";

  // Always log the real error on the server
  console.error(`🔥 [ErrorHandler] ${statusCode} — ${err.message}`, err.stack ? err.stack.split('\n')[0] : '');

  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json({
      status,
      message: err.message,
      stack: err.stack,
    });
  }

  // Production mode
  if (err.isOperational) {
    // Trusted, user-facing errors — send the real message
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  // Handle common Mongoose / JWT errors and convert them to user-friendly messages
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ status: "error", message: `Validation failed: ${messages}` });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ status: "error", message: `Invalid value for field: ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(", ");
    return res.status(409).json({ status: "error", message: `Duplicate value for: ${field}` });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ status: "error", message: "Invalid token. Please log in again." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ status: "error", message: "Your session has expired. Please log in again." });
  }

  // Unknown/programming error — send the actual message but hide the stack
  return res.status(500).json({
    status: "error",
    message: err.message || "An unexpected error occurred. Please try again.",
  });
};
