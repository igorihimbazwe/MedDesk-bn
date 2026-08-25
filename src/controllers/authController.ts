import { Request, Response } from "express";
import User from "../models/user";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/mailer";

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    res.status(400).json({ message: "Email, password, and role are required." });
    return;
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const isRoleAllowed = 
    (user.role === role) || 
    (user.role === "superadmin" && role === "admin");

    if (!isRoleAllowed) {
      res.status(403).json({ message: "Role mismatch. You do not have access to this area." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ message: "Your account is not active" });
      return;
    }


    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || "defaultSecretKey",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful.",
      token
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  const genericResponse = {
    message: "If that email is registered, a password reset link has been sent.",
  };

  try {
    const user = await User.findOne({ email });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Error during forgot password:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400).json({ message: "New password is required." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters." });
    return;
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired reset link." });
      return;
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ message: "Old password and new password are required." });
    return;
  }

  try {

    const user = await User.findById(req.user?.id);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }


    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      res.status(401).json({ message: "Old password is incorrect." });
      return;
    }

    user.password = newPassword;

    await user.save();



    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error during password change:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
