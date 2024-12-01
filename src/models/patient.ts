import mongoose, { Schema, Document } from "mongoose";

export interface IPatient extends Document {
  name: string;
  phoneNumber: string;
  dateAssigned: Date;
  dateOfAppointment: Date; 
  reason: string;
  doctorAssigned: mongoose.Types.ObjectId;
  status: "pending" | "complete";
  receptionist: mongoose.Types.ObjectId;
  gender: "male" | "female" | "other"; 
  fatherName?: string;
  motherName?: string;
  sector?: string;
  insurance?: string;
  editReason:string;
  appointmentLocation:string;
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
    dateAssigned: {
      type: Date,
      required: true,
    },
    dateOfAppointment: { 
      type: Date,
      required: false,
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
    editReason: {
      type: String,
      required: false,
      default:null,
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
    },
    fatherName: {
      type: String,
      required: false,
    },
    motherName: {
      type: String,
      required: false,
    },
    sector: {
      type: String,
      required: false,
    },
    insurance: {
      type: String,
      required: false,
    },
    appointmentLocation: {
      type: String,
      required: false,
      default:"Nyarugenge",
    },
    
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model<IPatient>("Patient", PatientSchema);
export default Patient;
