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

export type DocumentHistoryCheckpoint = {
  version: string;
  label: string;
  kind: "snapshot" | "update";
  createdAt: number;
  updateCount: number;
  state: number[];
};

export type DocumentHistorySession = {
  id: string;
  documentId: string;
  userId: string | null;
  authorName: string | null;
  authorStatus: "tracked" | "unknown" | "not-recorded";
  startAt: number;
  lastActivityAt: number;
  updateCount: number;
  checkpoints: DocumentHistoryCheckpoint[];
};

const SESSION_INACTIVITY_MS = 5 * 60 * 1000;
const CHECKPOINT_UPDATE_INTERVAL = 20;
const CHECKPOINT_TIME_INTERVAL_MS = 60 * 1000;

export async function loadDocumentHistory(docId: string): Promise<DocumentHistorySession[]> {
  const [snapshotResult, updateResult] = await Promise.all([
    db.query<{ id: string; state: Buffer; created_at: string }>(
      "SELECT id, state, created_at FROM doc_snapshots WHERE doc_id = $1 ORDER BY created_at ASC, id ASC",
      [docId],
    ),
    db.query<{
      id: string;
      update_data: Buffer;
      created_at: string;
      user_id: string | null;
      author_name: string | null;
    }>(
      "SELECT updates.id, updates.update_data, updates.created_at, updates.user_id, users.name AS author_name FROM doc_updates AS updates LEFT JOIN users ON users.id = updates.user_id WHERE updates.doc_id = $1 ORDER BY updates.created_at ASC, updates.id ASC",
      [docId],
    ),
  ]);

  const snapshots = snapshotResult.rows;
  const latestSnapshot = snapshots[snapshots.length - 1];
  const sessions: DocumentHistorySession[] = snapshots.map((snapshot) => {
    const createdAt = Number(snapshot.created_at);
    return {
      id: `snapshot-session-${snapshot.id}`,
      documentId: docId,
      userId: null,
      authorName: null,
      authorStatus: "not-recorded",
      startAt: createdAt,
      lastActivityAt: createdAt,
      updateCount: 0,
      checkpoints: [{
        version: `snapshot-${snapshot.id}`,
        label: "Database snapshot",
        kind: "snapshot",
        createdAt,
        updateCount: 0,
        state: Array.from(snapshot.state),
      }],
    };
  });

  const ydoc = new Y.Doc();
  let activeSession: DocumentHistorySession | null = null;
  let lastCheckpointAt = 0;
  let lastCheckpointUpdateCount = 0;
  let lastUpdateVersion = "";
  let lastState: number[] = [];

  const finishSession = (): void => {
    if (!activeSession || activeSession.updateCount === 0) return;

    const finalCheckpoint = activeSession.checkpoints[activeSession.checkpoints.length - 1];
    if (finalCheckpoint?.version === lastUpdateVersion) {
      finalCheckpoint.label = "Session final state";
      return;
    }

    activeSession.checkpoints.push({
      version: lastUpdateVersion,
      label: "Session final state",
      kind: "update",
      createdAt: activeSession.lastActivityAt,
      updateCount: activeSession.updateCount,
      state: lastState,
    });
  };

  try {
    if (latestSnapshot) Y.applyUpdate(ydoc, latestSnapshot.state);

    for (const row of updateResult.rows) {
      const createdAt = Number(row.created_at);
      if (latestSnapshot && createdAt < Number(latestSnapshot.created_at)) continue;

      if (
        !activeSession ||
        activeSession.userId !== row.user_id ||
        createdAt - activeSession.lastActivityAt > SESSION_INACTIVITY_MS
      ) {
        finishSession();
        activeSession = {
          id: `session-${row.id}`,
          documentId: docId,
          userId: row.user_id,
          authorName: row.author_name,
          authorStatus: row.user_id ? "tracked" : "unknown",
          startAt: createdAt,
          lastActivityAt: createdAt,
          updateCount: 0,
          checkpoints: [],
        };
        sessions.push(activeSession);
        lastCheckpointAt = createdAt;
        lastCheckpointUpdateCount = 0;
      } else if (!activeSession.authorName && row.author_name) {
        activeSession.authorName = row.author_name;
      }

      Y.applyUpdate(ydoc, row.update_data);
      activeSession.updateCount += 1;
      activeSession.lastActivityAt = createdAt;
      lastUpdateVersion = `update-${row.id}`;
      lastState = Array.from(Y.encodeStateAsUpdate(ydoc));

      const firstUpdate = activeSession.updateCount === 1;
      const checkpointDue =
        activeSession.updateCount - lastCheckpointUpdateCount >= CHECKPOINT_UPDATE_INTERVAL ||
        createdAt - lastCheckpointAt >= CHECKPOINT_TIME_INTERVAL_MS;

      if (firstUpdate || checkpointDue) {
        activeSession.checkpoints.push({
          version: lastUpdateVersion,
          label: firstUpdate ? "Started editing" : `Checkpoint after ${activeSession.updateCount} updates`,
          kind: "update",
          createdAt,
          updateCount: activeSession.updateCount,
          state: lastState,
        });
        lastCheckpointAt = createdAt;
        lastCheckpointUpdateCount = activeSession.updateCount;
      }
    }

    finishSession();
  } finally {
    ydoc.destroy();
  }

  return sessions.sort((left, right) => left.startAt - right.startAt);
}

export async function saveUpdate(
  docId: string,
  update: Uint8Array,
  origin?: string,
  userId?: string | null,
): Promise<void> {
  const client = await db.connect();
  const now = Date.now();
  try {
    await client.query("BEGIN");
    await ensureDocumentExists(client, docId);
    await client.query(
      "INSERT INTO doc_updates (doc_id, update_data, origin, created_at, user_id) VALUES ($1, $2, $3, $4, $5)",
      [docId, Buffer.from(update), origin ?? "unknown", now, userId ?? null],
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
