import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  phoneNumber: string;
  dateOfAppointment: Date;
  reason: string;
  doctorAssigned: mongoose.Types.ObjectId;
  status: "pending" | "complete";
  receptionist: mongoose.Types.ObjectId;
  gender: "male" | "female" | "other";
  fatherName: string;
  motherName: string;
  sector: string;
  insurance: string;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    dateOfAppointment: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: false,
    },
    doctorAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "complete"],
      default: "pending",
    },
    receptionist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    fatherName: {
      type: String,
      required: true,
    },
    motherName: {
      type: String,
      required: true,
    },
    sector: {
      type: String,
      required: true,
    },
    insurance: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
export default Patient;
