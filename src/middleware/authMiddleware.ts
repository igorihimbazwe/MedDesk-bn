import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
      };
    }
  }
}

interface JwtPayload {
  id: string;
  name: string;
  email: string;
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

    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token." });
  }
};

export const checkRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ message: "Forbidden. Insufficient permissions." });
      return;
    }
    next();
  };
};
