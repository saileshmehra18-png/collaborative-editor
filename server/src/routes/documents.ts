import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const result = await db.query<{ id: string; title: string; updated_at: string }>(
    "SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC",
  );
  res.json(result.rows.map((document) => ({
    ...document,
    updated_at: Number(document.updated_at),
  })));
});

router.post("/", async (req, res) => {
  const id = nanoid();
  const now = Date.now();
  const title = req.body?.title ?? "Untitled";
  await db.query(
    "INSERT INTO documents (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)",
    [id, title, now, now],
  );
  res.json({ id, title });
});

export default router;
