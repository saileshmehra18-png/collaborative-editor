import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { loadDocState, saveUpdate } from "../services/persistence";
import { verifyToken } from "../services/auth";

const docs = new Map<string, Y.Doc>();
const pendingDocs = new Map<string, Promise<Y.Doc>>();
const conns = new Map<string, Set<WebSocket>>();
const awareness = new Map<string, awarenessProtocol.Awareness>();
const updateQueues = new Map<string, Promise<void>>();
const persistenceFailures = new Map<string, unknown>();
// Track which WebSocket owns which clientIDs for cleanup
const wsToClientIds = new Map<WebSocket, Set<number>>();
let webSocketServer: WebSocketServer | undefined;
let isShuttingDown = false;

function getOrCreateDoc(docId: string): Promise<Y.Doc> {
  const existingDoc = docs.get(docId);
  if (existingDoc) return Promise.resolve(existingDoc);

  const pendingDoc = pendingDocs.get(docId);
  if (pendingDoc) return pendingDoc;

  const initialization = (async () => {
    const ydoc = new Y.Doc();
    const persisted = await loadDocState(docId);
    if (persisted) Y.applyUpdate(ydoc, persisted);

    ydoc.on("update", (update: Uint8Array, origin: any) => {
      broadcast(docId, update, origin);
    });

    docs.set(docId, ydoc);
    conns.set(docId, new Set());

    const aw = new awarenessProtocol.Awareness(ydoc);
    awareness.set(docId, aw);

    aw.on("update", ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated).concat(removed);
      broadcastAwareness(docId, changedClients, origin);
    });

    return ydoc;
  })();

  pendingDocs.set(docId, initialization);
  void initialization.then(
    () => pendingDocs.delete(docId),
    () => pendingDocs.delete(docId),
  );
  return initialization;
}

function queueYjsUpdate(docId: string, ydoc: Y.Doc, update: Uint8Array, origin: WebSocket): void {
  const previousUpdate = updateQueues.get(docId) ?? Promise.resolve();
  const nextUpdate = previousUpdate.then(async () => {
    if (persistenceFailures.has(docId)) {
      throw new Error("Document persistence is unavailable");
    }

    await saveUpdate(docId, update, "client");
    Y.applyUpdate(ydoc, update, origin);
  });

  updateQueues.set(docId, nextUpdate.catch((error: unknown) => {
    if (persistenceFailures.has(docId)) return;

    persistenceFailures.set(docId, error);
    console.error(`Failed to persist Yjs update for document ${docId}`, error);
    for (const client of conns.get(docId) ?? []) {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1011, "document persistence failed");
      }
    }
  }));
}

export async function shutdownWebSocketServer(): Promise<void> {
  isShuttingDown = true;

  if (webSocketServer && webSocketServer.clients.size > 0) {
    const activeWebSocketServer = webSocketServer;
    const closed = new Promise<void>((resolve) => {
      activeWebSocketServer.close(() => resolve());
    });
    for (const client of activeWebSocketServer.clients) {
      client.close(1001, "server shutting down");
    }

    await Promise.all(updateQueues.values());
    await closed;
    return;
  }

  await Promise.all(updateQueues.values());
}

function broadcast(docId: string, update: Uint8Array, origin: WebSocket) {
  const peers = conns.get(docId);
  if (!peers) return;
  const message = JSON.stringify({ type: "update", update: Array.from(update) });
  for (const ws of peers) {
    if (ws !== origin && ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}

function broadcastAwareness(docId: string, changedClients: number[], origin: any) {
  const aw = awareness.get(docId);
  if (!aw) return;

  const peers = conns.get(docId);
  if (!peers) return;

  // Encode awareness update using Yjs protocol
  const update = awarenessProtocol.encodeAwarenessUpdate(aw, changedClients);
  const message = JSON.stringify({
    type: "awareness",
    update: Array.from(update)
  });

  for (const ws of peers) {
    if (ws !== origin && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function attachWsServer(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 1_000_000 });
  webSocketServer = wss;

  wss.on("connection", async (ws: WebSocket, req) => {
    if (isShuttingDown) {
      ws.close(1001, "server shutting down");
      return;
    }

    const url = new URL(req.url ?? "", "http://localhost");
    const docId = url.searchParams.get("docId");
    const token = url.searchParams.get("token");

    if (!docId || !token) {
      ws.close(1008, "docId and token required");
      return;
    }
    try {
      verifyToken(token);
    } catch {
      ws.close(1008, "invalid or expired token");
      return;
    }

    let ydoc: Y.Doc;
    try {
      ydoc = await getOrCreateDoc(docId);
    } catch (error) {
      console.error(`Failed to load document ${docId}`, error);
      ws.close(1011, "document could not be loaded");
      return;
    }
    if (isShuttingDown) {
      ws.close(1001, "server shutting down");
      return;
    }
    if (persistenceFailures.has(docId)) {
      ws.close(1011, "document persistence unavailable");
      return;
    }
    const aw = awareness.get(docId)!;
    conns.get(docId)!.add(ws);

    // Send initial document state
    ws.send(JSON.stringify({
      type: "sync",
      update: Array.from(Y.encodeStateAsUpdate(ydoc)),
    }));

    // Send current awareness state of all other clients
    const awarenessStates = Array.from(aw.getStates().keys());
    if (awarenessStates.length > 0) {
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(aw, awarenessStates);
      ws.send(JSON.stringify({
        type: "awareness",
        update: Array.from(awarenessUpdate)
      }));
    }

    ws.on("message", (raw: Buffer) => {
      if (isShuttingDown) {
        ws.close(1001, "server shutting down");
        return;
      }

      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.close(1007, "invalid message");
        return;
      }

      if (msg.type === "update") {
        const update = new Uint8Array(msg.update);
        queueYjsUpdate(docId, ydoc, update, ws);
      } else if (msg.type === "awareness") {
        // Apply awareness update from client
        const update = new Uint8Array(msg.update);
        awarenessProtocol.applyAwarenessUpdate(aw, update, ws);

        // Track which clientIDs this WebSocket is using
        const clients = Array.from(aw.getStates().keys());

        if (!wsToClientIds.has(ws)) {
          wsToClientIds.set(ws, new Set());
        }

        // Add all current client IDs from this awareness update
        clients.forEach(clientId => {
          const state = aw.getStates().get(clientId);
          // Track this clientId as belonging to this WebSocket
          if (state) {
            wsToClientIds.get(ws)!.add(clientId);
          }
        });
      }
    });

    ws.on("close", () => {
      conns.get(docId)?.delete(ws);

      // Remove awareness states for all clientIDs owned by this WebSocket
      const clientIds = wsToClientIds.get(ws);
      if (clientIds && clientIds.size > 0) {
        awarenessProtocol.removeAwarenessStates(aw, Array.from(clientIds), ws);
      }
      wsToClientIds.delete(ws);
    });
  });
}
