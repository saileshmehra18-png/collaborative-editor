import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword, signToken } from "../services/auth";

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid email format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    return res.status(409).json({ error: "email already registered" });
  }

  const id = nanoid();
  const password_hash = await hashPassword(password);
  const now = Date.now();

  try {
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, name, email, password_hash, "user", now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "email already registered" });
    }
    throw error;
  }

  const token = signToken({ id, role: "user" });
  res.status(201).json({ token, user: { id, name, email, role: "user" } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0] as {
    id: string;
    name: string;
    email: string;
    role: string;
    password_hash: string;
  } | undefined;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/guest", (_req, res) => {
  // No DB entry - guests are ephemeral, judge-only demo access.
  const guestId = "guest-" + nanoid();
  const token = signToken({ id: guestId, role: "guest" });
  res.json({ token, user: { id: guestId, role: "guest" } });
});

export default router;
