import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "../config/db";
import User, { UserRole } from "../models/user";

dotenv.config(); 

const seedUsers = async () => {
  try {
    await connectDB(); 

    const users = [
      
      {
        name: "UMULISA Alice",
        email: "umulisaalice@gmail.com",
        password: "amatamamam",
        phoneNumber: "098-765-4371",
        role: UserRole.RECEPTIONIST,
      },
      {
        name: "UGIRUMURENGERA Blaise",
        email: "ugblaise@gmail.com",
        password: "amatamamam",
        phoneNumber: "098-765-4361",
        role: UserRole.RECEPTIONIST,
      },
      {
        name: "NSHIMIYIMANA Jean Claude",
        email: "jeanclaudensh@gmail.com",
        password: "amatamamam",
        phoneNumber: "098-765-4341",
        role: UserRole.RECEPTIONIST,
      },
      {
        name: "OMBENI Vedaste",
        email: "ombenivedaste@gmail.com",
        password: "amatamamam",
        phoneNumber: "098-765-4301",
        role: UserRole.RECEPTIONIST,
      },

      
      {
        name: "Alice Johnson",
        email: "alice.johnson@example.com",
        password: "amatamamam",
        phoneNumber: "123-456-7890",
        role: UserRole.DOCTOR,
        status: "active", 
      },
      {
        name: "Charlie Brown",
        email: "charlie.brown@example.com",
        password: "amatamamam",
        phoneNumber: "555-555-5555",
        role: UserRole.DOCTOR,
        status: "active",
      },

      
      {
        name: "Dr. Eugene Lambert",
        email: "eugene.lambert@example.com",
        password: "amatamamam",
        phoneNumber: "987-654-3210",
        role: UserRole.DOCTOR,
        status: "not available", 
      },

      
      {
        name: "Dr. Clara Wilson",
        email: "clara.wilson@example.com",
        password: "amatamamam",
        phoneNumber: "111-222-3333",
        role: UserRole.DOCTOR,
        status: "active",
      },
      {
        name: "Dr. Olivia Martinez",
        email: "olivia.martinez@example.com",
        password: "amatamamam",
        phoneNumber: "222-333-4444",
        role: UserRole.DOCTOR,
        status: "active",
      },
      {
        name: "Receptionist Jane Doe",
        email: "jane.doe@example.com",
        password: "amatamamam",
        phoneNumber: "333-444-5555",
        role: UserRole.RECEPTIONIST,
      },
    ];

    
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      }))
    );

    
    await User.deleteMany();
    await User.insertMany(hashedUsers);

    console.log("Seed data successfully inserted!");

    process.exit(0); 
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedUsers();
