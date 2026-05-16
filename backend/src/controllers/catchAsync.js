export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      console.error("🔥 [ASYNC ERROR]:", err);
      next(err);
    });
  };
};
