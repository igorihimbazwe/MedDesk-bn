import { Request, Response } from "express";
import User from "../models/user";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    
    const token = jwt.sign(
      { id: user._id, name: user.name,email: user.email,role: user.role },
      process.env.JWT_SECRET || "defaultSecretKey",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful.",
      token
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error });
  }
};
