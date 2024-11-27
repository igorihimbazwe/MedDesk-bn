import express from "express";
import { protect, checkRole } from "../middleware/authMiddleware";
import Patient from "../models/patient";
import User from "../models/user";

const router = express.Router();

import { isValid, parse } from "date-fns";

router.post(
  "/add",
  protect,
  checkRole("receptionist"),
  async (req, res): Promise<void> => {
    const {
      name,
      phoneNumber,
      reason,
      gender,
      fatherName,
      motherName,
      sector,
      insurance,
      dateOfAppointment, 
    } = req.body;

    try {
      
      if (!dateOfAppointment) {
        res.status(400).json({ message: "dateOfAppointment is required." });
        return;
      }

      const parsedDate = parse(dateOfAppointment, "yyyy-MM-dd", new Date());
      if (!isValid(parsedDate)) {
        res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        return;
      }

      const existingPatient = await Patient.findOne({
        phoneNumber,
        dateAssigned: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      });

      if (existingPatient) {
        res.status(400).json({ message: "This patient already has a doctor assigned for today." });
        return;
      }

      const doctors = await User.find({ role: "doctor",  status: "active"  });

      if (!doctors.length) {
        res.status(400).json({ message: "No doctors available." });
        return;
      }

      let selectedDoctor = null;
      let minPatients = Infinity;

      for (const doctor of doctors) {
        const patientCount = await Patient.countDocuments({
          doctorAssigned: doctor._id,
          dateAssigned: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
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
        dateAssigned: new Date(),
        dateOfAppointment: parsedDate, 
        reason,
        gender,
        fatherName,
        motherName,
        sector,
        insurance,
        doctorAssigned: selectedDoctor._id,
        receptionist: receptionistId,
      });

      await newPatient.save();

      const populatedPatient = await Patient.findById(newPatient._id).populate("doctorAssigned", "id name");

      res.status(201).json({ message: "Patient added successfully", patient: populatedPatient });
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
  "/edit/:id",
  protect,
  checkRole("receptionist"),
  async (req, res): Promise<void> => {
    const { id } = req.params;
    const {
      name,
      phoneNumber,
      reason,
      dateOfAppointment,
    } = req.body;

    try {
      const patient = await Patient.findById(id);

      if (!patient) {
        res.status(404).json({ message: "Patient not found" });
        return;
      }

      if (patient.status !== "pending") {
        res.status(400).json({ message: "Only patients with a pending status can be updated." });
        return;
      }

      // Handle dateOfAppointment if it's provided
      if (dateOfAppointment) {
        const parsedDate = parse(dateOfAppointment, "yyyy-MM-dd", new Date());
        if (!isValid(parsedDate)) {
          res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
          return;
        }
        patient.dateOfAppointment = parsedDate; // Update the date
      }

      // Update other fields if provided
      if (name) patient.name = name;
      if (phoneNumber) patient.phoneNumber = phoneNumber;
      if (reason) patient.reason = reason;

      await patient.save();

      const populatedPatient = await Patient.findById(patient._id).populate("doctorAssigned", "id name");

      res.status(200).json({ message: "Patient updated successfully", populatedPatient });
    } catch (error: any) {
      res.status(500).json({ message: "Error updating patient", error: error.message });
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

router.get(
  "/filter-by-appointment",
  protect,
  async (req, res): Promise<void> => {
    const { filter } = req.query; 

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

      let dateFilter: any;

      if (filter === "today") {
        dateFilter = {
          dateOfAppointment: {
            $gte: today,
            $lt: tomorrow,
          },
        };
      } else if (filter === "tomorrow") {
        dateFilter = {
          dateOfAppointment: {
            $gte: tomorrow,
            $lt: dayAfterTomorrow,
          },
        };
      } else if (filter === "others") {
        dateFilter = {
          dateOfAppointment: {
            $gte: dayAfterTomorrow,
          },
        };
      } else {
        res.status(400).json({ message: "Invalid filter value. Use 'today', 'tomorrow', or 'others'." });
        return;
      }

      const patients = await Patient.find(dateFilter).populate("doctorAssigned", "name").populate("receptionist", "name");

      res.status(200).json({ message: "Filtered patients fetched successfully", patients });
    } catch (error: any) {
      res.status(500).json({ message: "Error filtering patients", error: error.message });
    }
  }
);

router.get(
  "/dashboard-stats",
  protect,
  async (req, res): Promise<void> => {
    try {
      
      const [totalPatients, pendingPatients, completePatients, totalDoctors,activeDoctors] = await Promise.all([
        Patient.countDocuments(), 
        Patient.countDocuments({ status: "pending" }), 
        Patient.countDocuments({ status: "complete" }), 
        User.countDocuments({role:"doctor"}),
        User.countDocuments({ role: "doctor", status: "active" }), 
      ]);

      res.status(200).json({
        totalPatients,
        pendingPatients,
        completePatients,
          totalDoctors,
        activeDoctors,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
    }
  }
);



export default router;
