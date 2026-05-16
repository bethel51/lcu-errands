import { Notification } from "../models/Notification.js";
import { catchAsync } from "./catchAsync.js";

export const getNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(notifications);
});

export const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  res.json({ message: "Notification marked as read" });
});

export const markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  res.json({ message: "All notifications marked as read" });
});
