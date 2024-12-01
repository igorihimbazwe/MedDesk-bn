import express from 'express';
import { protect, checkRole } from '../middleware/authMiddleware';
import Patient from '../models/patient';
import User from '../models/user';
import moment from 'moment';
import mongoose from 'mongoose';

const router = express.Router();

router.get(
  '/dashboard-stats-admin',
  protect,
  async (req, res): Promise<void> => {
    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        res.status(403).json({
          message: 'Access denied. Only admins can access this data.',
        });
      }

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
  async (req, res): Promise<void> => {
    const { startDate, endDate, doctorId, status } = req.query;

    try {
      const userRole = req.user?.role;

      if (userRole !== 'admin') {
        res.status(403).json({
          message:
            'Access denied. Only admins can filter patients by appointment.',
        });
      }

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

router.get('/doctors-with-stats', protect, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query;

  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      res
        .status(403)
        .json({ message: 'Access denied. Only admins can view this data.' });
      return;
    }

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

export default router;
