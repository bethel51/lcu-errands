import { Router } from "express";
import { adminLogin, adminLogout } from "../controllers/adminAuthController";

const router = Router();

router.post("/login", adminLogin);
router.post("/logout", adminLogout);

export default router;
