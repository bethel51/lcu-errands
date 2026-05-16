export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error("🛡️ [ADMIN-SERVICE ERROR] 💥", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    status: "error",
    message: err.message || "Something went wrong in the Admin Service",
    error: process.env.NODE_ENV === "development" ? err : undefined,
  });
};
