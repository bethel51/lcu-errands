import { Router } from "express";
import {
  getStats,
  getAllUsers,
  getAllErrands,
  getErrandIntel,
  approveErrandTransaction,
  rejectErrandTransaction,
  toggleErrandSuspicious,
  freezeErrandFunds,
  toggleSuspendUser,
  verifyUser,
  getAllWithdrawals,
  processWithdrawal,
  getHealthStatus,
  getPendingVerifications,
  getAllLogs,
  sendBroadcast,
  getChatHistory,
  getUserWithdrawalEvidence,
  getAllFootprints,
} from "../controllers/adminController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = Router();

// Protect all management routes with admin-only auth
router.use(adminAuthMiddleware);

router.get("/stats", getStats);
router.get("/users", getAllUsers);
router.get("/errands", getAllErrands);
router.get("/withdrawals", getAllWithdrawals);
router.get("/footprints", getAllFootprints);
router.patch("/users/:id/suspend", toggleSuspendUser);
router.patch("/users/:id/verify", verifyUser);
router.get("/pending-verifications", getPendingVerifications);
router.patch("/withdrawals/:id/process", processWithdrawal);
router.get("/health", getHealthStatus);
router.get("/logs", getAllLogs);
router.post("/broadcast", sendBroadcast);
router.get("/chat/:errandId", getChatHistory);
router.get("/withdrawal-evidence/:userId", getUserWithdrawalEvidence);

// Errand intelligence & transaction management
router.get("/errands/:errandId/intel", getErrandIntel);
router.patch("/errands/:errandId/approve", approveErrandTransaction);
router.patch("/errands/:errandId/reject", rejectErrandTransaction);
router.patch("/errands/:errandId/flag", toggleErrandSuspicious);
router.patch("/errands/:errandId/freeze", freezeErrandFunds);

export default router;
