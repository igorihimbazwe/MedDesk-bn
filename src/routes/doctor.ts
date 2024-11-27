import { Router, Request, Response } from "express";
import User from "../models/user";
import Patient from "../models/patient";
import { protect, checkRole } from "../middleware/authMiddleware";
import { UserRole } from "../models/user";

const router = Router();


router.post(
  "/add-doctor",
  protect,
  checkRole("receptionist"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, phoneNumber } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "Doctor with this email already exists." });
        return;
      }

      const newDoctor = new User({
        name,
        email,
        password,
        phoneNumber,
        role: UserRole.DOCTOR,
      });

      await newDoctor.save();

      res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding doctor", error: error.message });
    }
  }
);


router.patch(
  "/update-doctor-status/:doctorId",
  protect,
  checkRole("receptionist"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId } = req.params;
      const { status } = req.body;

      if (!["active", "not available"].includes(status)) {
        res.status(400).json({ message: "Invalid status value. Use 'active' or 'not available'." });
        return;
      }

      const doctor = await User.findById(doctorId);

      if (!doctor || doctor.role !== UserRole.DOCTOR) {
        res.status(404).json({ message: "Doctor not found." });
        return;
      }

      doctor.status = status;
      await doctor.save();

      res.status(200).json({ message: "Doctor status updated successfully", doctor });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating doctor status", error: error.message });
    }
  }
);


router.get(
  "/doctors",
  protect,
  checkRole("receptionist"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      
      const doctors = await User.find({ role: UserRole.DOCTOR });

      if (!doctors.length) {
        res.status(404).json({ message: "No doctors found." });
        return;
      }

      
      const doctorPatientData = await Promise.all(
        doctors.map(async (doctor) => {
          const patientCount = await Patient.countDocuments({ doctorAssigned: doctor._id });
          return {
            id: doctor._id,
            name: doctor.name,
            email: doctor.email,
            phoneNumber: doctor.phoneNumber,
            status: doctor.status,
            patientCount,
          };
        })
      );

      res.status(200).json({
        message: "Doctors and their patient counts retrieved successfully.",
        doctors: doctorPatientData,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error retrieving doctors and patient counts", error: error.message });
    }
  }
);

export default router;
