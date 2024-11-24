import { Router } from "express";
import authRoutes from "./authRoutes";
// import patientRoutes from "./patientRoutes";

const router = Router();

// router.use("/patients", patientRoutes);
router.use("/auth", authRoutes);

export default router;
