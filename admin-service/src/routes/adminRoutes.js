import { Router } from "express";
import {
  getStats,
  getAllUsers,
  getAllErrands,
  toggleSuspendUser,
  verifyUser,
  getAllWithdrawals,
  processWithdrawal,
  getHealthStatus,
  getPendingVerifications,
  getAllLogs,
  sendBroadcast,
  getChatHistory,
} from "../controllers/adminController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = Router();

// Protect all management routes with the NEW admin-only auth
router.use(adminAuthMiddleware);

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/errands", getAllErrands);
router.get("/withdrawals", getAllWithdrawals);
router.patch("/users/:id/suspend", toggleSuspendUser);
router.patch("/users/:id/verify", verifyUser);
router.get("/pending-verifications", getPendingVerifications);
router.patch("/withdrawals/:id/process", processWithdrawal);
router.get("/health", getHealthStatus);
router.get("/logs", getAllLogs);
router.post("/broadcast", sendBroadcast);
router.get("/chat/:errandId", getChatHistory);

export default router;
