import express,{Request,Response} from 'express';
import { protect, checkRole } from '../middleware/authMiddleware';
import Patient from '../models/patient';
import User,{UserRole} from '../models/user';
import moment from 'moment';
import mongoose from 'mongoose';

const router = express.Router();

router.get(
  '/dashboard-stats-admin',
  protect,
  checkRole('admin','superadmin'),
  async (req, res): Promise<void> => {
    try {

      const startDate = req.query.startDate
        ? moment(req.query.startDate as string)
            .startOf('day')
            .toDate()
        : moment().startOf('day').toDate();

      const endDate = req.query.endDate
        ? moment(req.query.endDate as string)
            .endOf('day')
            .toDate()
        : moment().endOf('day').toDate();

      const [totalAppointments, pendingAppointments, completeAppointments] =
        await Promise.all([
          Patient.countDocuments({
            dateAssigned: { $gte: startDate, $lte: endDate },
          }),
          Patient.countDocuments({
            status: 'pending',
            dateAssigned: { $gte: startDate, $lte: endDate },
          }),
          Patient.countDocuments({
            status: 'complete',
            dateAssigned: { $gte: startDate, $lte: endDate },
          }),
        ]);

      res.status(200).json({
        totalPatients: totalAppointments,
        pendingPatients: pendingAppointments,
        completePatients: completeAppointments,
        timeRange: { startDate, endDate },
      });
    } catch (error: any) {
      res.status(500).json({
        message: 'Error fetching dashboard statistics',
        error: error.message,
      });
    }
  },
);

router.get(
  '/filter-by-appointment-admin',
  protect,
  checkRole('admin','superadmin'),
  async (req, res): Promise<void> => {
    const { startDate, endDate, doctorId, status } = req.query;

    try {


      const start = startDate
        ? moment(startDate as string)
            .startOf('day')
            .toDate()
        : moment().startOf('day').toDate();

      const end = endDate
        ? moment(endDate as string)
            .endOf('day')
            .toDate()
        : moment().endOf('day').toDate();

      const dateFilter: any = {
        dateAssigned: { $gte: start, $lte: end },
      };

      const patients = await Patient.find(dateFilter)
        .populate('doctorAssigned', 'name')
        .populate('receptionist', 'name');

      res.status(200).json({
        message: 'Filtered patients fetched successfully',
        patients,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Error filtering patients', error: error.message });
    }
  },
);

router.get('/doctors-with-stats', protect,checkRole('admin','superadmin'), async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  try {

    const start = startDate
      ? moment(startDate as string)
          .startOf('day')
          .toDate()
      : moment().startOf('day').toDate();

    const end = endDate
      ? moment(endDate as string)
          .endOf('day')
          .toDate()
      : moment().endOf('day').toDate();

    const doctors = await User.find({ role: 'doctor' });

    const doctorsWithStats = await Promise.all(
      doctors.map(async (doctor) => {
        const [totalPatients, pendingPatients, completePatients] =
          await Promise.all([
            Patient.countDocuments({
              doctorAssigned: doctor._id,
              dateOfAppointment: { $gte: start, $lte: end },
            }),
            Patient.countDocuments({
              doctorAssigned: doctor._id,
              dateOfAppointment: { $gte: start, $lte: end },
              status: 'pending',
            }),
            Patient.countDocuments({
              doctorAssigned: doctor._id,
              dateOfAppointment: { $gte: start, $lte: end },
              status: 'complete',
            }),
          ]);

        return {
          doctorId: doctor._id,
          name: doctor.name,
          phoneNumber: doctor.phoneNumber,
          totalPatients,
          pendingPatients,
          completePatients,
        };
      }),
    );

    res.status(200).json({
      message: 'Admins and their patient stats fetched successfully',
      admins: doctorsWithStats,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        message: 'Error fetching admins and their stats',
        error: error.message,
      });
  }
});

router.patch(
  '/assign-doctor-to-patient/:patientId',
  protect,
  checkRole('admin','superadmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { doctorId, appointmentDate, editReason } = req.body;

      // Ensure editReason is provided
      if (!editReason) {
        res.status(400).json({ message: 'Edit reason is required.' });
        return;
      }

      // Validate the doctor ID
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== UserRole.DOCTOR) {
        res.status(404).json({ message: 'Doctor not found or invalid doctor ID.' });
        return;
      }

      // Validate the patient ID
      const patient = await Patient.findById(patientId);
      if (!patient) {
        res.status(404).json({ message: 'Patient not found.' });
        return;
      }

      // Update the doctor assignment and appointment date
      if (doctorId) {
        patient.doctorAssigned = doctorId;
      }
      if (appointmentDate) {
        patient.dateOfAppointment = new Date(appointmentDate);
      }

      // Add the edit reason
      patient.editReason = editReason;

      await patient.save();

      res.status(200).json({
        message: 'Doctor assigned and/or appointment date updated successfully.',
        patient,
      });
    } catch (error: any) {
      res.status(500).json({
        message: 'Error updating patient details',
        error: error.message,
      });
    }
  }
);

router.get(
  '/superadmin/admins',
  protect,
  checkRole('superadmin'),
  async (req, res): Promise<void> => {
    try {
      const admins = await User.find({ role: 'admin' });
      res.status(200).json({
        message: 'Admins fetched successfully',
        admins,
      });
    } catch (error: any) {
      res.status(500).json({
        message: 'Error fetching admins',
        error: error.message,
      });
    }
  },
);

// Toggle admin status (active/inactive)
router.patch(
  '/superadmin/toggle-admin-status/:adminId',
  protect,
  checkRole('superadmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { adminId } = req.params;

      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        res.status(404).json({ message: 'Admin not found or invalid ID.' });
        return;
      }

      // Toggle status
      admin.status = admin.status === 'active' ? 'not available' : 'active';
      await admin.save();

      res.status(200).json({
        message: `Admin status toggled to ${admin.status}.`,
        admin,
      });
    } catch (error: any) {
      res.status(500).json({
        message: 'Error toggling admin status',
        error: error.message,
      });
    }
  },
);

router.post(
  "/add-patient",
  protect,
  checkRole('admin','superadmin'),
  async (req, res): Promise<void> => {
    const {
      name,
      phoneNumber,
      gender,
      fatherName,
      motherName,
      sector,
      insurance,
      doctorAssigned,
    } = req.body;

    try {
      const existingPatient = await Patient.findOne({
        phoneNumber,
        dateAssigned: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      });

      if (existingPatient) {
        res
          .status(400)
          .json({ message: "This patient already has a doctor assigned for today." });
          return;
      }

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
        doctorAssigned,
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


export default router;
