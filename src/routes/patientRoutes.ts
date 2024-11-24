import express from "express";
import { protect, checkRole } from "../middleware/authMiddleware";
import Patient from "../models/patient";
import User from "../models/user";

const router = express.Router();

router.post(
  "/add",
  protect,
  checkRole("receptionist"),
  async (req, res): Promise<void> => {
    const { name, phoneNumber, reason } = req.body;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const existingPatient = await Patient.findOne({
        phoneNumber,
        dateOfAppointment: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existingPatient) {
        res.status(400).json({ message: "This patient already has a doctor assigned for today." });
        return;
      }

      const doctors = await User.find({ role: "doctor" });

      if (!doctors.length) {
        res.status(400).json({ message: "No doctors available." });
        return;
      }

      let selectedDoctor = null;
      let minPatients = Infinity;

      for (const doctor of doctors) {
        const patientCount = await Patient.countDocuments({
          doctorAssigned: doctor._id,
          dateOfAppointment: { $gte: startOfDay, $lte: endOfDay },
        });

        if (patientCount < minPatients) {
          selectedDoctor = doctor;
          minPatients = patientCount;
        }
      }

      if (!selectedDoctor) {
        res.status(400).json({ message: "No available doctor to assign." });
        return;
      }

      const newPatient = new Patient({
        name,
        phoneNumber,
        dateOfAppointment: new Date(),
        reason,
        doctorAssigned: selectedDoctor._id,
      });

      await newPatient.save();
      res.status(201).json({ message: "Patient added successfully", patient: newPatient });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding patient", error: error.message });
    }
  }
);

export default router;
