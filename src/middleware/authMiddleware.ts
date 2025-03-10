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

export const checkRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role; // Safely access role
    
    // Check if the user has a role
    if (!userRole) {
      res.status(403).json({ message: "Access denied. No role assigned. Please contact your administrator." });
      return;
    }

    // Check if the user is trying to access a superadmin-only route
    const isSuperadminOnlyRoute = roles.length === 1 && roles[0] === "superadmin";

    if (isSuperadminOnlyRoute && userRole !== "superadmin") {
      res.status(403).json({ message: "Access denied. Only superadmins can perform this action." });
      return;
    }

    // Check if the user has one of the required roles
    if (!roles.includes(userRole)) {
      res.status(403).json({ message: "Access denied. You do not have the necessary permissions to perform this action." });
      return;
    }

    next();
  };
};
