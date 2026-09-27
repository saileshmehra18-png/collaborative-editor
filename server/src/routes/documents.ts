import { Router } from "express";
import { db } from "../db/client";
import { nanoid } from "nanoid";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { loadDocumentHistory } from "../services/persistence";
import { canReadDocument, getDocumentPermission } from "../services/permissions";
import { closeDocumentConnectionsForUser } from "../ws/server";

const router = Router();
router.use(requireAuth);

router.get("/:docId/history", async (req, res) => {
  const { docId } = req.params;
  const userId = (req as AuthedRequest).user!.id;
  const permission = await getDocumentPermission(docId, userId);
  if (!canReadDocument(permission)) {
    return res.status(404).json({ error: "document not found" });
  }

  const versions = await loadDocumentHistory(docId);
  res.json(versions);
});

router.get("/:docId/permissions", async (req, res) => {
  const { docId } = req.params;
  const userId = (req as AuthedRequest).user!.id;
  const permission = await getDocumentPermission(docId, userId);
  if (permission !== "owner") {
    return res.status(permission ? 403 : 404).json({ error: "owner permission required" });
  }

  const result = await db.query<{
    user_id: string;
    name: string;
    email: string;
    permission: "editor" | "viewer";
    created_at: string;
  }>(
    "SELECT users.id AS user_id, users.name, users.email, document_permissions.permission, document_permissions.created_at FROM document_permissions JOIN users ON users.id = document_permissions.user_id WHERE document_permissions.doc_id = $1 ORDER BY users.name, users.email",
    [docId],
  );
  res.json(result.rows.map((grant) => ({
    userId: grant.user_id,
    name: grant.name,
    email: grant.email,
    permission: grant.permission,
    createdAt: Number(grant.created_at),
  })));
});

router.put("/:docId/permissions", async (req, res) => {
  const { docId } = req.params;
  const userId = (req as AuthedRequest).user!.id;
  const permission = await getDocumentPermission(docId, userId);
  if (permission !== "owner") {
    return res.status(permission ? 403 : 404).json({ error: "owner permission required" });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const grantPermission = req.body?.permission;
  if (!email || (grantPermission !== "editor" && grantPermission !== "viewer")) {
    return res.status(400).json({ error: "email and an editor or viewer permission are required" });
  }

  const targetResult = await db.query<{ id: string; name: string; email: string }>(
    "SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)",
    [email],
  );
  const target = targetResult.rows[0];
  if (!target) {
    return res.status(404).json({ error: "user not found" });
  }
  if (target.id === userId) {
    return res.status(400).json({ error: "the owner already has full access" });
  }

  const now = Date.now();
  await db.query(
    "INSERT INTO document_permissions (doc_id, user_id, permission, granted_by, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (doc_id, user_id) DO UPDATE SET permission = EXCLUDED.permission, granted_by = EXCLUDED.granted_by, created_at = EXCLUDED.created_at",
    [docId, target.id, grantPermission, userId, now],
  );
  closeDocumentConnectionsForUser(docId, target.id);
  res.json({
    userId: target.id,
    name: target.name,
    email: target.email,
    permission: grantPermission,
    createdAt: now,
  });
});

router.delete("/:docId/permissions/:userId", async (req, res) => {
  const { docId, userId: targetUserId } = req.params;
  const userId = (req as AuthedRequest).user!.id;
  const permission = await getDocumentPermission(docId, userId);
  if (permission !== "owner") {
    return res.status(permission ? 403 : 404).json({ error: "owner permission required" });
  }
  if (targetUserId === userId) {
    return res.status(400).json({ error: "transfer ownership before removing owner access" });
  }

  await db.query(
    "DELETE FROM document_permissions WHERE doc_id = $1 AND user_id = $2",
    [docId, targetUserId],
  );
  closeDocumentConnectionsForUser(docId, targetUserId);
  res.status(204).end();
});

router.get("/", async (req, res) => {
  const userId = (req as AuthedRequest).user!.id;
  const result = await db.query<{
    id: string;
    title: string;
    updated_at: string;
    permission: "owner" | "editor" | "viewer";
  }>(
    "SELECT documents.id, documents.title, documents.updated_at, CASE WHEN documents.owner_id = $1 THEN 'owner' ELSE document_permissions.permission END AS permission FROM documents LEFT JOIN document_permissions ON document_permissions.doc_id = documents.id AND document_permissions.user_id = $1 WHERE documents.owner_id = $1 OR document_permissions.permission IS NOT NULL ORDER BY documents.updated_at DESC",
    [userId],
  );
  res.json(result.rows.map((document) => ({
    ...document,
    updated_at: Number(document.updated_at),
  })));
});

router.post("/", async (req, res) => {
  const user = (req as AuthedRequest).user!;
  if (user.role === "guest") {
    return res.status(403).json({ error: "full account required to create an owned document" });
  }

  const id = nanoid();
  const now = Date.now();
  const title = req.body?.title ?? "Untitled";
  await db.query(
    "INSERT INTO documents (id, title, created_at, updated_at, owner_id) VALUES ($1, $2, $3, $4, $5)",
    [id, title, now, now, user.id],
  );
  res.json({ id, title });
});

export default router;
