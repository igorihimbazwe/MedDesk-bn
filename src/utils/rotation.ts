import Rotation from '../models/rotationnn';
import User, { UserRole } from '../models/user';
import mongoose, { ObjectId } from 'mongoose';

interface ProcessedDoctor {
  id: mongoose.Types.ObjectId;
  schedule: number[];
}

interface DoctorFromDB {
  _id: mongoose.Types.ObjectId;
  doctorSchedule?: string[];
}

// Day mapping
const dayMapping: Record<string, number> = {
  sunday: 7,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export async function getDoctorsFromDB() {
  try {
    const doctors: DoctorFromDB[] = await User.find(
      { role: UserRole.DOCTOR, status: "active" }
    ).select("_id doctorSchedule");

    if (!doctors || doctors.length === 0) {
      throw new Error("No active doctors found with schedules.");
    }

    // Process doctors to map schedules into day numbers
    const processedDoctors: ProcessedDoctor[] = doctors.map((doctor) => {
      const schedule = doctor.doctorSchedule?.map((day: string) => {
        const dayNumber = dayMapping[day.toLowerCase()];
        if (dayNumber === undefined) {
          throw new Error(`Invalid day in schedule: ${day}`);
        }
        return dayNumber;
      }) || [];
      return { id: doctor._id, schedule };
    });

    let sortedDoctors: mongoose.Types.ObjectId[] = [];
    const doctorFrequency: Record<string, number> = {};

    // Initialize the frequency map
    processedDoctors.forEach((doctor) => {
      doctorFrequency[doctor.id.toString()] = 0;
    });

    // Generate the sequence based on days of the week
    for (let day = 1; day <= 7; day++) {
      // Filter doctors available on the current day
      const availableDoctors = processedDoctors.filter((doctor) =>
        doctor.schedule.includes(day)
      );

      // Sort available doctors by their frequency in the sortedDoctors array
      availableDoctors.sort((a, b) => {
        const freqA = doctorFrequency[a.id.toString()];
        const freqB = doctorFrequency[b.id.toString()];
        return freqA - freqB;
      });

      // Add doctors to the sorted array and update their frequencies
      for (const doctor of availableDoctors) {
        sortedDoctors.push(doctor.id as mongoose.Types.ObjectId);
        doctorFrequency[doctor.id.toString()]++;
      }
    }

    return sortedDoctors;
  } catch (error) {
    console.error("Error in getDoctorsFromDB:", error);
    throw error;
  }
}

// Function to get the current doctor index
async function getCurrentDoctorIndex() {
  const rotation = await Rotation.findOne({ key: 'currentDoctorIndex' });
  return rotation ? rotation.value : 0;
}

// Function to update the current doctor index
async function updateCurrentDoctorIndex(index: any) {
  await Rotation.updateOne(
    { key: 'currentDoctorIndex' },
    { value: index },
    { upsert: true },
  );
}

// Function to assign the next doctor
export const assignDoctor = async (): Promise<mongoose.Types.ObjectId> => {
  try {
    const doctors = await getDoctorsFromDB();
    const currentIndex = await getCurrentDoctorIndex();

    if (doctors.length === 0) {
      throw new Error("No doctors available to assign.");
    }

    const assignedDoctor = doctors[currentIndex];
    const nextIndex = (currentIndex + 1) % doctors.length;

    await updateCurrentDoctorIndex(nextIndex);
    return assignedDoctor;
  } catch (error) {
    console.error("Error in assignDoctor:", error);
    throw error;
  }
};