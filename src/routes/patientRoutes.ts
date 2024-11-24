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
    const { name, dateOfAppointment, reason } = req.body;

    try {
      const doctors = await User.find({ role: "doctor" });

      if (!doctors.length) {
        res.status(400).json({ message: "No doctors available." });
        return;  
      }

      let selectedDoctor = null;
      let minPatients = Infinity;

      for (const doctor of doctors) {
        const patientCount = await Patient.countDocuments({ doctorAssigned: doctor._id });

        if (patientCount < minPatients) {
          selectedDoctor = doctor;
          minPatients = patientCount;
        }
      }

      if (!selectedDoctor) {
        res.status(400).json({ message: "No available doctor to assign." });
        return;  // Return after responding
      }

      const newPatient = new Patient({
        name,
        dateOfAppointment,
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
