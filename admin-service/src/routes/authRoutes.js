import { Router } from "express";
import { login, createInitialAdmin } from "../controllers/authController.js";
import { requireSetupMode } from "../middleware/setupMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/init", requireSetupMode, createInitialAdmin); // Guarded: requires SETUP_MODE=true

export default router;
