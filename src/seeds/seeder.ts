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
        name: "Admin Alice",
        email: "adminalice@gmail.com",
        password: "amatamamam",
        phoneNumber: "123-456-7890",
        role: UserRole.RECEPTIONIST,
        status: "active", 
      },
    ];

    
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      }))
    );

    await User.insertMany(hashedUsers);

    console.log("Seed data successfully inserted!");

    process.exit(0); 
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedUsers();
