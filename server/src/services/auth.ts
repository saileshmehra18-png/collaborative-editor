import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32 || secret === "change-me-to-a-random-secret") {
      throw new Error("Set JWT_SECRET to a unique random value of at least 32 characters in production");
    }
  }
  if (secret) return secret;
  return "dev-secret-change-in-prod";
}

export function assertAuthConfig(): void {
  getJwtSecret();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, getJwtSecret());
}
