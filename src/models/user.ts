import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

// Define allowed roles as an enum
export enum UserRole {
  DOCTOR = "doctor",
  RECEPTIONIST = "receptionist",
}

// Extend the IUser interface to include role
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: UserRole;
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
      enum: Object.values(UserRole), // Restrict to enum values
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt); // Ensure `this.password` is typed correctly
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Add a method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
