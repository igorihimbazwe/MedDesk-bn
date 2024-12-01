import Rotation from '../models/rotationnn';
import mongoose, { ObjectId } from 'mongoose';

// Hardcoded array of doctors in the specified order
// const doctors = [
//   new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
//   'Justin',
//   'Sandeep R',
//   'Justin',
//   'Danilo',
//   'Sandeep N',
//   'Valens',
//   'Justin R',
//   'Muhamedi',
//   'Valens',
//   'Justin R',
//   'Valens',
//   'Sandeep N',
//   'Muhamedi',
//   'Sandeep R',
//   'Justin',
//   'Valens',
// ];

const doctors = [
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd7'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd8'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd7'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd9'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdda'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd7'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd9'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd7'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd9'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdda'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd6'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd7'),
  new mongoose.Types.ObjectId('674b1ab812b75d23e409bdd9'),
];

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
export const assignDoctor = async (): Promise<any> => {
  const currentIndex = await getCurrentDoctorIndex();
  const assignedDoctor = doctors[currentIndex];
  const nextIndex = (currentIndex + 1) % doctors.length;
  await updateCurrentDoctorIndex(nextIndex);
  return assignedDoctor;
};