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

      const receptionistId = req.user?.id;

      const newPatient = new Patient({
        name,
        phoneNumber,
        dateOfAppointment: new Date(),
        reason,
        doctorAssigned: selectedDoctor._id,
        receptionist: receptionistId,
      });

      await newPatient.save();
      res.status(201).json({ message: "Patient added successfully", patient: newPatient });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding patient", error: error.message });
    }
  }
);

router.get(
  "/assigned-patients",
  protect,
  async (req, res): Promise<void> => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      let patients;

      if (userRole === "receptionist") {
        patients = await Patient.find({ receptionist: userId }).populate("doctorAssigned", "name email");
        res.status(200).json({ message: "Patients assigned by you", patients });
      } else if (userRole === "doctor") {
        patients = await Patient.find({ doctorAssigned: userId }).populate("receptionist", "name email");
        res.status(200).json({ message: "Patients assigned to you", patients });
      } else {
        res.status(403).json({ message: "Access denied. Only receptionist and doctor can view assigned patients." });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching assigned patients", error: error.message });
    }
  }
);

router.put(
  "/mark-complete/:id",
  protect,
  checkRole("doctor"),
  async (req, res): Promise<void> => {
    const { id } = req.params;

    try {
      const patient = await Patient.findById(id);

      if (!patient) {
        res.status(404).json({ message: "Patient not found" });
        return;
      }

      
      const doctorId = req.user!.id;

      if (patient.doctorAssigned.toString() !== doctorId) {
        res.status(403).json({ message: "You are not assigned to this patient." });
        return;
      }

      if (patient.status !== "pending") {
        res
          .status(400)
          .json({ message: "Only patients with a pending status can be marked as complete." });
        return;
      }

      
      patient.status = "complete";
      await patient.save({ validateModifiedOnly: true });

      res.status(200).json({ message: "Patient status updated to complete", patient });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating patient status", error: error.message });
    }
  }
);


export default router;
