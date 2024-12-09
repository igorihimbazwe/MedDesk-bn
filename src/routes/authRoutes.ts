import express from "express";
import { loginUser, changePassword } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();


router.post("/login", loginUser);
router.put("/change-password", protect, changePassword);

export default router;
