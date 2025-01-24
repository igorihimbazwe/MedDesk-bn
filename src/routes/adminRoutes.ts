import express,{Request,Response} from 'express';
import { protect, checkRole } from '../middleware/authMiddleware';
import Patient from '../models/patient';
import User,{UserRole} from '../models/user';
import moment from 'moment';
import exceljs from 'exceljs';
import mongoose from 'mongoose';

const router = express.Router();

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

router.get(
  '/dashboard-stats-admin',
  protect,
  checkRole('admin','superadmin'),
  async (req, res): Promise<void> => {
    try {

      const startDate = req.query.startDate
        ? moment(req.query.startDate as string)
            .startOf('day')
            .utc(true)
            .toDate()
        : moment().startOf('day').utc(true).toDate();

      const endDate = req.query.endDate
        ? moment(req.query.endDate as string)
            .endOf('day')
            .utc(true)
            .toDate()
        : moment().endOf('day').utc(true).toDate();

      const [totalAppointments, pendingAppointments, completeAppointments] =
        await Promise.all([
          Patient.countDocuments({
            dateOfAppointment: { $gte: startDate, $lte: endDate },
          }),
          Patient.countDocuments({
            status: 'pending',
            dateOfAppointment: { $gte: startDate, $lte: endDate },
          }),
          Patient.countDocuments({
            status: 'complete',
            dateOfAppointment: { $gte: startDate, $lte: endDate },
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
  ? moment(startDate as string).startOf('day').utc(true).toDate()
  : moment().startOf('day').utc(true).toDate();

const end = endDate
  ? moment(endDate as string).endOf('day').utc(true).toDate()
  : moment().endOf('day').utc(true).toDate();

      const dateFilter: any = {
        dateOfAppointment: { $gte: start, $lte: end },
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
          .utc(true)
          .toDate()
      : moment().startOf('day').utc(true).toDate();

    const end = endDate
      ? moment(endDate as string)
          .endOf('day')
          .utc(true)
          .toDate()
      : moment().endOf('day').utc(true).toDate();

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
          status: doctor.status,
          email: doctor.email,
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

      if (patient.status === "complete") {
        res.status(409).json({ message: "This patient's treatment has already been marked as complete." });
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

router.get(
  '/download-patient-report',
  protect,
  checkRole('admin', 'superadmin'),
  async (req, res): Promise<void> => {
    const { startDate, endDate } = req.query;

    try {
      const start = startDate
        ? moment(startDate as string).startOf('day').utc(true).toDate()
        : moment().startOf('day').utc(true).toDate();

      const end = endDate
        ? moment(endDate as string).endOf('day').utc(true).toDate()
        : moment().endOf('day').utc(true).toDate();

      const dateFilter: any = {
        dateOfAppointment: { $gte: start, $lte: end },
      };

      const patients = await Patient.find(dateFilter)
        .populate<{ doctorAssigned: { name: string } }>('doctorAssigned', 'name')
        .populate<{ receptionist: { name: string } }>('receptionist', 'name');

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Patients Report');
  
        const startDateFormatted = moment(start).format('YYYY-MM-DD');
        const endDateFormatted = moment.utc(end).format('YYYY-MM-DD');

        const reportTitle = (startDateFormatted === "2004-01-01" && endDateFormatted === "2060-12-31")
          ? "All time appointments records"
          : `Appointment of patients from ${startDateFormatted} to ${endDateFormatted}`;
  
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = reportTitle;
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        
        worksheet.addRow([]);
  
        worksheet.addRow([
          "Patient's Name",
          'Phone Number',
          'Doctor Assigned',
          'Date of Appointment',
          'Gender',
          'Insurance',
          'Receptionist',
        ]).font = { bold: true };
  
        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 20;
        worksheet.getColumn(5).width = 10;
        worksheet.getColumn(6).width = 20;
        worksheet.getColumn(7).width = 25;
  
        patients.forEach((patient) => {
          const rowData = [
            patient.name || 'N/A',
            patient.phoneNumber || 'N/A',
            patient.doctorAssigned?.name || 'N/A',
            moment(patient.dateOfAppointment).format('MM-DD-YYYY') || 'N/A',
            patient.gender === "male" ? "Male" : "Female",
            patient.insurance || 'N/A',
            patient.receptionist?.name || 'N/A',
          ];
  
          worksheet.addRow(rowData);
        });
  
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="Patients_Report.xlsx"'
        );

        await workbook.xlsx.write(res);
        res.end();
      } catch (error: any) {
        res.status(500).json({ message: 'Error downloading patient report', error: error.message });
      }
    }
  );

//Adding new doctor
router.post(
  "/add-doctor",
  protect,
  checkRole('admin', 'superadmin'),
  async (req, res): Promise<void> => {
  try {
    const { name, email, phoneNumber, doctorSchedule } = req.body;

    if (!name || !email || !phoneNumber) {
      res.status(400).json({ message: "Name, email, and phone number are required" });
      return;
    }

    const existingDoctor = await User.findOne({ email });
    if (existingDoctor) {
      res.status(400).json({ message: "Doctor with this email already exists" });
      return;
    }

    const defaultPassword = process.env.DEFAULT_PASSWORD;
    if (!defaultPassword) {
      res.status(500).json({ message: "Default password is not set in environment variables" });
      return;
    }

    const newDoctor = new User({
      name,
      email,
      password: defaultPassword,
      phoneNumber,
      role: UserRole.DOCTOR,
      status: "active",
      doctorSchedule: doctorSchedule || [],
    });

    await newDoctor.save();

    res.status(201).json({ message: "Doctor added successfully", doctor: newDoctor });
  } catch (error) {
    console.error("Error adding doctor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Getting doctors and their names
router.get(
  "/doctor-schedules",
  protect,
  async (req, res): Promise<void> => {
    try {
      const doctors = await User.find<{ _id: mongoose.Types.ObjectId; name: string }>(
        { role: UserRole.DOCTOR, status: "active" }
      ).select("_id name");

      if (!doctors || doctors.length === 0) {
        res.status(404).json({ message: "No active doctors found." });
        return;
      }

      // Map the doctors to return only their IDs and names
      const doctorList = doctors.map((doctor) => ({
        id: doctor._id.toString(),
        name: doctor.name,
      }));
      
      res.status(200).json(doctorList);

    } catch (error: any) {
      res.status(500).json({ message: "Error retrieving doctors", error: error.message });
    }
  }
);

router.put("/:doctorId/status", async (req, res): Promise<void> => {
  try {
    const { doctorId } = req.params;

    // Find doctor by ID
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    // Toggle status
    doctor.status = doctor.status === "active" ? "not available" : "active";
    await doctor.save();

    res.status(200).json({
      message: `Doctor status updated to ${doctor.status}`,
      status: doctor.status,
    });
  } catch (error) {
    console.error("Error updating doctor status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
