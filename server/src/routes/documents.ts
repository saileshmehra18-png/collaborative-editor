import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth";
import { loadDocumentHistory } from "../services/persistence";

const router = Router();
router.use(requireAuth);

router.get("/:docId/history", async (req, res) => {
  const { docId } = req.params;
  const document = await db.query("SELECT id FROM documents WHERE id = $1", [docId]);
  if (document.rowCount === 0) {
    return res.status(404).json({ error: "document not found" });
  }

  const versions = await loadDocumentHistory(docId);
  res.json(versions);
});

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
