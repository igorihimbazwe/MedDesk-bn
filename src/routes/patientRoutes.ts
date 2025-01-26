import express from "express";
import { protect, checkRole } from "../middleware/authMiddleware";
import Patient from "../models/patient";
import User, { UserRole } from "../models/user";
import moment from 'moment';
import { startOfDay, endOfDay } from "date-fns";
import { assignDoctor } from "../utils/rotation";
import mongoose from 'mongoose';

const router = express.Router();

import { isValid, parse } from "date-fns";

// Day mapping to convert string days to numeric values (0 = Sunday, 1 = Monday, etc.)
const dayMapping: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

router.post(
  "/add",
  protect,
  checkRole("receptionist"),
  async (req, res): Promise<void> => {
    const {
      name,
      phoneNumber,
      gender,
      fatherName,
      motherName,
      sector,
      insurance,
    } = req.body;

    try {
      // const existingPatient = await Patient.findOne({
      //   phoneNumber,
      //   dateAssigned: {
      //     $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      //     $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      //   },
      // });

      // if (existingPatient) {
      //   res
      //     .status(400)
      //     .json({ message: "This patient already has a doctor assigned for today." });
      //     return;
      // }

      const assignedDoctor = await assignDoctor();

      const receptionistId = req.user?.id;

      const newPatient = new Patient({
        name,
        phoneNumber,
        dateAssigned: new Date(),
        reason: "Orthodontic placement",
        gender,
        fatherName,
        motherName,
        sector,
        insurance,
        doctorAssigned: assignedDoctor,
        receptionist: receptionistId,
      });

      await newPatient.save();

      const populatedPatient = await Patient.findById(newPatient._id).populate("doctorAssigned", "id name");

      res.status(201).json({
        message: "Patient added successfully.",
        patient: populatedPatient,
        assignedDoctor: populatedPatient?.doctorAssigned,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error adding patient", error: error.message });
    }
  }
);

router.put(
  "/schedule-appointment/:patientId",
  protect,
  checkRole("receptionist"),
  async (req, res): Promise<void> => {
    const { patientId } = req.params;
    const { dateOfAppointment } = req.body;

    try {
      if (!dateOfAppointment) {
        res.status(400).json({ message: "dateOfAppointment is required." });
        return;
      }

      const parsedDate = parse(dateOfAppointment, "yyyy-MM-dd", new Date());

      const utcDate = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate()
      ));
      
      if (!isValid(utcDate)) {
        res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        return;
      }

      const updatedPatient = await Patient.findByIdAndUpdate(
        patientId,
        { dateOfAppointment: utcDate },
        { new: true }
      );

      if (!updatedPatient) {
        res.status(404).json({ message: "Patient not found." });
        return;
      }

      const populatedPatient = await Patient.findById(updatedPatient._id).populate("doctorAssigned", "id name");
      res.status(200).json({
        message: "Appointment date updated successfully.",
        patient: populatedPatient,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error scheduling appointment", error: error.message });
    }
  }
);


router.post(
  "/addd",
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

      
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      let patients;

      if (userRole === "receptionist") {
        
        patients = await Patient.find({
          receptionist: userId,
          dateAssigned: { $gte: todayStart, $lte: todayEnd },
        }).populate("doctorAssigned", "name email");

        res.status(200).json({ message: "Patients assigned by you for today", patients });
      } else if (userRole === "doctor") {
        
        patients = await Patient.find({
          doctorAssigned: userId,
          dateOfAppointment: { $gte: todayStart, $lte: todayEnd },
        }).populate("receptionist", "name email");

        res.status(200).json({ message: "Patients with appointments today", patients });
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
      insurance,
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

      
      if (dateOfAppointment) {
        const parsedDate = parse(dateOfAppointment, "yyyy-MM-dd", new Date());
        if (!isValid(parsedDate)) {
          res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
          return;
        }
        patient.dateOfAppointment = parsedDate; 
      }

      
      if (name) patient.name = name;
      if (phoneNumber) patient.phoneNumber = phoneNumber;
      if (reason) patient.reason = reason;
      if(insurance) patient.insurance = insurance;

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
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== "doctor") {
          res.status(403).json({ message: "Access denied. Only doctors can filter patients by appointment." });
          return; 
      }

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

      
      dateFilter.doctorAssigned = userId;

      const patients = await Patient.find(dateFilter)
        .populate("doctorAssigned", "name")
        .populate("receptionist", "name");

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
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole === "receptionist") {
        
        const [
          totalPatients,
          pendingPatients,
          completePatients,
          totalDoctors,
          activeDoctors,
        ] = await Promise.all([
          Patient.countDocuments(), 
          Patient.countDocuments({ status: "pending" }), 
          Patient.countDocuments({ status: "complete" }), 
          User.countDocuments({ role: "doctor" }), 
          User.countDocuments({ role: "doctor", status: "active" }), 
        ]);

        res.status(200).json({
          totalPatients,
          pendingPatients,
          completePatients,
          totalDoctors,
          activeDoctors,
        });
      } else if (userRole === "doctor") {
        
        const [totalAssigned, pendingAssigned, completeAssigned] = await Promise.all([
          Patient.countDocuments({ doctorAssigned: userId }), 
          Patient.countDocuments({ doctorAssigned: userId, status: "pending" }), 
          Patient.countDocuments({ doctorAssigned: userId, status: "complete" }), 
        ]);

        res.status(200).json({
          totalAssigned,
          pendingAssigned,
          completeAssigned,
        });
      } else {
        res.status(403).json({ message: "Access denied. Only receptionists and doctors can access this data." });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
    }
  }
);

router.get(
  "/dashboard-stats-doc",
  protect,
  async (req, res): Promise<void> => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const startDate = req.query.startDate 
      ? moment(req.query.startDate as string).startOf('day').utc(true).toDate() 
      : moment().startOf('day').utc(true).toDate();
    
    const endDate = req.query.endDate 
      ? moment(req.query.endDate as string).utc(true).endOf('day').toDate() 
      : moment().endOf('day').utc(true).toDate();

      if (userRole === "doctor") {
        const [totalAssigned, pendingAssigned, completeAssigned] = await Promise.all([
          Patient.countDocuments({
            doctorAssigned: userId,
            dateOfAppointment: {
              $gte: startDate,
              $lte: endDate,
            }
          }),
          Patient.countDocuments({
            doctorAssigned: userId,
            status: "pending",
            dateOfAppointment: {
              $gte: startDate,
              $lte: endDate,
            }
          }),
          Patient.countDocuments({
            doctorAssigned: userId,
            status: "complete",
            dateOfAppointment: {
              $gte: startDate,
              $lte: endDate,
            }
          }),
        ]);

        res.status(200).json({
          totalPatients: totalAssigned,
          pendingPatients: pendingAssigned,
          completePatients: completeAssigned,
          timeRange: { startDate, endDate },
        });
      } else {
        res.status(403).json({ message: "Access denied. Only doctors can access this data." });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
    }
  }
);


router.get(
  "/filter-by-appointment-doc",
  protect,
  async (req, res): Promise<void> => {
    const { startDate, endDate } = req.query;

    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== "doctor") {
        res.status(403).json({ message: "Access denied. Only doctors can filter patients by appointment." });
        return;
      }

      const start = startDate 
        ? moment(startDate as string).startOf('day').utc(true).toDate()
        : moment().startOf('day').utc(true).toDate();
        
      const end = endDate 
        ? moment(endDate as string).endOf('day').utc(true).toDate()
        : moment().endOf('day').utc(true).toDate();

      const dateFilter = {
        doctorAssigned: userId,
        dateOfAppointment: {
          $gte: start,
          $lte: end,
        },
      };

      const patients = await Patient.find(dateFilter)
        .populate("doctorAssigned", "name")
        .populate("receptionist", "name");

      res.status(200).json({
        message: "Filtered patients fetched successfully",
        patients,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error filtering patients", error: error.message });
    }
  }
);

router.get(
  "/dashboard-stats-receptionist",
  protect,
  async (req, res): Promise<void> => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

        const startDate = req.query.startDate
        ? moment(req.query.startDate as string).startOf('day').utc(true).toDate()
        : moment().startOf('day').utc(true).toDate();
      
      const endDate = req.query.endDate
        ? moment(req.query.endDate as string).endOf('day').utc(true).toDate()
        : moment().endOf('day').utc(true).toDate();

      if (userRole !== "receptionist") {
        res.status(403).json({ message: "Access denied. Only receptionists can access this data." });
      }

      const assignedReceptionistFilter = { receptionist: userId };

      const [totalAssigned, pendingAssigned, completeAssigned] = await Promise.all([
        Patient.countDocuments({
          dateAssigned: { $gte: startDate, $lte: endDate },
          ...assignedReceptionistFilter
        }),
        Patient.countDocuments({
          status: "pending",
          dateAssigned: { $gte: startDate, $lte: endDate },
          ...assignedReceptionistFilter
        }),
        Patient.countDocuments({
          status: "complete",
          dateAssigned: { $gte: startDate, $lte: endDate },
          ...assignedReceptionistFilter
        }),
      ]);

      res.status(200).json({
        totalPatients: totalAssigned,
        pendingPatients: pendingAssigned,
        completePatients: completeAssigned,
        timeRange: { startDate, endDate },
      });

    } catch (error: any) {
      res.status(500).json({ message: "Error fetching dashboard statistics", error: error.message });
    }
  }
);


router.get(
  "/filter-by-appointment-receptionist",
  protect,
  async (req, res): Promise<void> => {
    const { startDate, endDate, doctorId, status } = req.query;

    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (userRole !== "receptionist") {
        res.status(403).json({ message: "Access denied. Only receptionists can filter patients by appointment." });
      }

        const start = startDate
        ? moment(startDate as string).startOf('day').utc(true).toDate()
        : moment().startOf('day').utc(true).toDate();
      
      const end = endDate
        ? moment(endDate as string).endOf('day').utc(true).toDate()
        : moment().endOf('day').utc(true).toDate();

      const dateFilter: any = {
        dateAssigned: { $gte: start, $lte: end },
        receptionist: userId,
      };

      const patients = await Patient.find(dateFilter)
        .populate("doctorAssigned", "name")
        .populate("receptionist", "name");

      res.status(200).json({
        message: "Filtered patients fetched successfully",
        patients,
      });

    } catch (error: any) {
      res.status(500).json({ message: "Error filtering patients", error: error.message });
    }
  }
);

//Getting doctors and the days they are available on
router.get(
  "/doctor-schedules",
  protect,
  async (req, res): Promise<void> => {
    try {
      const doctors = await User.find<{ _id: mongoose.Types.ObjectId; doctorSchedule: string[] }>(
        { role: UserRole.DOCTOR, status: "active" }
      ).select("_id doctorSchedule");
  
      if (!doctors || doctors.length === 0) {
        res.status(404).json({ message: "No active doctors found with schedules." });
        return;
      }
  
      // Process doctors to map schedules into day numbers
      const doctorSchedule: Record<string, number[]> = {};
  
      doctors.forEach((doctor) => {
        const doctorId = doctor._id.toString();
      
        if (doctor.doctorSchedule && doctor.doctorSchedule.length > 0) {
          const schedule = doctor.doctorSchedule.map((day: string) => {
            const dayNumber = dayMapping[day.toLowerCase()];
            if (dayNumber === undefined) {
              throw new Error(`Invalid day in schedule: ${day}`);
            }
            return dayNumber;
          });
      
          doctorSchedule[doctorId] = schedule;
        }
      });
  
      res.status(200).json(doctorSchedule);
      
    } catch (error: any) {
      res.status(500).json({ message: "Error getting doctors patients", error: error.message });
    }
  }
);

export default router;
