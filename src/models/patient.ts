import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  dateOfAppointment: Date;
  reason: string;
  doctorAssigned: mongoose.Types.ObjectId;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: true,
    },
    dateOfAppointment: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    doctorAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
export default Patient;
