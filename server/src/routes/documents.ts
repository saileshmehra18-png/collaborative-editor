import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";

const router = Router();

router.get("/", (_req, res) => {
  const docs = db.prepare("SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC").all();
  res.json(docs);
});

router.post("/", (req, res) => {
  const id = nanoid();
  const now = Date.now();
  const title = req.body?.title ?? "Untitled";
  db.prepare("INSERT INTO documents (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(id, title, now, now);
  res.json({ id, title });
});

export default router;
