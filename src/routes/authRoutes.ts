import express from "express";
import { loginUser, changePassword, forgotPassword, resetPassword } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();


router.post("/login", loginUser);
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
