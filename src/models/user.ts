import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";


export enum UserRole {
  DOCTOR = "doctor",
  RECEPTIONIST = "receptionist",
}


export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: UserRole;
  status: "active" | "not available"; 
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole), 
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "not available"], 
      default: "active", 
    },
  },
  {
    timestamps: true,
  }
);


UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt); 
    next();
  } catch (error) {
    next(error as Error);
  }
});


UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
