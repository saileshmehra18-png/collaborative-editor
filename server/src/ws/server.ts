import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { loadDocState, saveUpdate } from "../services/persistence";
import { verifyToken } from "../services/auth";

const docs = new Map<string, Y.Doc>();
const conns = new Map<string, Set<WebSocket>>();
const awareness = new Map<string, awarenessProtocol.Awareness>();
const wsToClientIds = new Map<WebSocket, Set<number>>();

function getOrCreateDoc(docId: string): Y.Doc {
  if (docs.has(docId)) return docs.get(docId)!;

  const ydoc = new Y.Doc();
  const persisted = loadDocState(docId);
  if (persisted) Y.applyUpdate(ydoc, persisted);

  ydoc.on("update", (update: Uint8Array, origin: any) => {
    saveUpdate(docId, update, typeof origin === "string" ? origin : "client");
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
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const docId = url.searchParams.get("docId");
    const token = url.searchParams.get("token");

    if (!docId) {
      ws.close(1008, "docId required");
      return;
    }

    if (!token) {
      ws.close(1008, "token required");
      return;
    }

    let userId: string;
    try {
      const payload = verifyToken(token);
      if (typeof payload === "string" || typeof payload.id !== "string") {
        throw new Error("token has no user id");
      }
      userId = payload.id;
    } catch {
      ws.close(1008, "invalid or expired token");
      return;
    }

    (ws as WebSocket & { userId?: string }).userId = userId;

    const ydoc = getOrCreateDoc(docId);
    const aw = awareness.get(docId)!;
    conns.get(docId)!.add(ws);

    ws.send(JSON.stringify({
      type: "sync",
      update: Array.from(Y.encodeStateAsUpdate(ydoc)),
    }));

    const awarenessStates = Array.from(aw.getStates().keys());
    if (awarenessStates.length > 0) {
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(aw, awarenessStates);
      ws.send(JSON.stringify({
        type: "awareness",
        update: Array.from(awarenessUpdate)
      }));
    }

    ws.on("message", (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "update") {
        const update = new Uint8Array(msg.update);
        Y.applyUpdate(ydoc, update, ws);
      } else if (msg.type === "awareness") {
        const update = new Uint8Array(msg.update);
        awarenessProtocol.applyAwarenessUpdate(aw, update, ws);

        const clients = Array.from(aw.getStates().keys());

        if (!wsToClientIds.has(ws)) {
          wsToClientIds.set(ws, new Set());
        }

        clients.forEach(clientId => {
          const state = aw.getStates().get(clientId);
          if (state) {
            wsToClientIds.get(ws)!.add(clientId);
          }
        });
      }
    });

    ws.on("close", () => {
      conns.get(docId)?.delete(ws);

      const clientIds = wsToClientIds.get(ws);
      if (clientIds && clientIds.size > 0) {
        awarenessProtocol.removeAwarenessStates(aw, Array.from(clientIds), ws);
      }
      wsToClientIds.delete(ws);
    });
  });
}
