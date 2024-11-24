import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "No token, authorization denied." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultSecretKey") as JwtPayload;

    
    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};
