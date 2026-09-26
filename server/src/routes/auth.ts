import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword, signToken } from "../services/auth";

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email ||
    typeof password !== "string" || !password
  ) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "invalid email format" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "email already registered" });
  }

  const id = nanoid();
  const password_hash = await hashPassword(password);
  const now = Date.now();

  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, email, password_hash, "user", now);

  const token = signToken({ id, role: "user" });
  res.status(201).json({ token, user: { id, name, email, role: "user" } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
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
