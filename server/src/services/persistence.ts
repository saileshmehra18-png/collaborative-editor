import { db } from "../db/client";
import type { PoolClient } from "pg";
import * as Y from "yjs";
import { nanoid } from "nanoid";

async function ensureDocumentExists(client: PoolClient, docId: string): Promise<void> {
  const now = Date.now();
  await client.query(
    "INSERT INTO documents (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
    [docId, "Untitled", now, now],
  );
}

export async function ensureDocument(docId: string): Promise<void> {
  const client = await db.connect();
  try {
    await ensureDocumentExists(client, docId);
  } finally {
    client.release();
  }
}

export async function loadDocState(docId: string): Promise<Uint8Array | null> {
  const snapshotResult = await db.query<{ state: Buffer }>(
    "SELECT state FROM doc_snapshots WHERE doc_id = $1 ORDER BY created_at DESC LIMIT 1",
    [docId],
  );
  const snapshot = snapshotResult.rows[0];

  const ydoc = new Y.Doc();
  if (snapshot) Y.applyUpdate(ydoc, snapshot.state);

  const updates = await db.query<{ update_data: Buffer }>(
    "SELECT update_data FROM doc_updates WHERE doc_id = $1 ORDER BY created_at ASC, id ASC",
    [docId],
  );

  for (const row of updates.rows) Y.applyUpdate(ydoc, row.update_data);

  return updates.rowCount || snapshot ? Y.encodeStateAsUpdate(ydoc) : null;
}

export async function saveUpdate(docId: string, update: Uint8Array, origin?: string): Promise<void> {
  const client = await db.connect();
  const now = Date.now();
  try {
    await client.query("BEGIN");
    await ensureDocumentExists(client, docId);
    await client.query(
      "INSERT INTO doc_updates (doc_id, update_data, origin, created_at) VALUES ($1, $2, $3, $4)",
      [docId, Buffer.from(update), origin ?? "unknown", now],
    );
    await client.query("UPDATE documents SET updated_at = $1 WHERE id = $2", [now, docId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function compactToSnapshot(docId: string): Promise<void> {
  const state = await loadDocState(docId);
  if (!state) return;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO doc_snapshots (id, doc_id, state, created_at) VALUES ($1, $2, $3, $4)",
      [nanoid(), docId, Buffer.from(state), Date.now()],
    );
    await client.query("DELETE FROM doc_updates WHERE doc_id = $1", [docId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
