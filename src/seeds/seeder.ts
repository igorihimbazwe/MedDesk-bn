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
        name: "Alice Johnson",
        email: "alice.johnson@example.com",
        password: "medidesk@123",
        phoneNumber: "123-456-7890",
        role: UserRole.DOCTOR,
      },
      {
        name: "Bob Smith",
        email: "bob.smith@example.com",
        password: "medidesk@123",
        phoneNumber: "098-765-4321",
        role: UserRole.RECEPTIONIST,
      },
      {
        name: "Charlie Brown",
        email: "charlie.brown@example.com",
        password: "medidesk@123",
        phoneNumber: "555-555-5555",
        role: UserRole.DOCTOR,
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
