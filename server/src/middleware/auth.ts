import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing or invalid authorization header" });
  }
  try {
    const payload = verifyToken(header.slice(7));
    if (typeof payload === "string" || typeof payload.id !== "string" || typeof payload.role !== "string") {
      return res.status(401).json({ error: "invalid or expired token" });
    }
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }
}

// Blocks guests from write actions - use on routes that require a real account.
export function requireFullUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role === "guest") {
    return res.status(403).json({ error: "guests cannot perform this action" });
  }
  next();
}
