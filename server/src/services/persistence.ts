import { db } from "../db/client";
import * as Y from "yjs";
import { nanoid } from "nanoid";

export function ensureDocument(docId: string) {
  const existing = db.prepare("SELECT id FROM documents WHERE id = ?").get(docId);
  if (!existing) {
    const now = Date.now();
    db.prepare(
      "INSERT INTO documents (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run(docId, "Untitled", now, now);
  }
}

export function loadDocState(docId: string): Uint8Array | null {
  const snapshot = db
    .prepare("SELECT state FROM doc_snapshots WHERE doc_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(docId) as { state: Buffer } | undefined;

  const ydoc = new Y.Doc();
  if (snapshot) Y.applyUpdate(ydoc, snapshot.state);

  const updates = db
    .prepare("SELECT update_data FROM doc_updates WHERE doc_id = ? ORDER BY created_at ASC")
    .all(docId) as { update_data: Buffer }[];

  for (const row of updates) Y.applyUpdate(ydoc, row.update_data);

  return updates.length || snapshot ? Y.encodeStateAsUpdate(ydoc) : null;
}

export function saveUpdate(docId: string, update: Uint8Array, origin?: string) {
  ensureDocument(docId);
  db.prepare(
    "INSERT INTO doc_updates (doc_id, update_data, origin, created_at) VALUES (?, ?, ?, ?)"
  ).run(docId, Buffer.from(update), origin ?? "unknown", Date.now());
  db.prepare("UPDATE documents SET updated_at = ? WHERE id = ?").run(Date.now(), docId);
}

export function compactToSnapshot(docId: string) {
  const state = loadDocState(docId);
  if (!state) return;
  db.prepare(
    "INSERT INTO doc_snapshots (id, doc_id, state, created_at) VALUES (?, ?, ?, ?)"
  ).run(nanoid(), docId, Buffer.from(state), Date.now());
  db.prepare("DELETE FROM doc_updates WHERE doc_id = ?").run(docId);
}
