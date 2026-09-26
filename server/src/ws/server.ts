import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as decoding from "lib0/decoding";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { loadDocState, saveUpdate } from "../services/persistence";
import { verifyToken } from "../services/auth";

const docs = new Map<string, Y.Doc>();
const conns = new Map<string, Set<WebSocket>>();
const awarenesses = new Map<string, Awareness>();
const awarenessOwners = new Map<string, Map<number, { socket: WebSocket; userId: string }>>();

function getAwarenessClients(update: Uint8Array): Array<{ clientId: number; state: unknown }> {
  const decoder = decoding.createDecoder(update);
  const count = decoding.readVarUint(decoder);
  const clients = [];

  for (let index = 0; index < count; index++) {
    const clientId = decoding.readVarUint(decoder);
    decoding.readVarUint(decoder);
    const state = JSON.parse(decoding.readVarString(decoder)) as unknown;
    clients.push({ clientId, state });
  }

  return clients;
}

function getOrCreateDoc(docId: string): Y.Doc {
  if (docs.has(docId)) return docs.get(docId)!;

  const ydoc = new Y.Doc();
  const persisted = loadDocState(docId);
  if (persisted) Y.applyUpdate(ydoc, persisted);

  ydoc.on("update", (update: Uint8Array, origin: any) => {
    saveUpdate(docId, update, typeof origin === "string" ? origin : "client");
    broadcast(docId, update, origin);
  });

  const awareness = new Awareness(ydoc);
  awareness.on(
    "update",
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const owners = awarenessOwners.get(docId)!;
      for (const clientId of removed) owners.delete(clientId);

      const clients = [...added, ...updated, ...removed];
      if (clients.length === 0) return;

      const message = JSON.stringify({
        type: "awareness",
        update: Array.from(encodeAwarenessUpdate(awareness, clients)),
      });
      for (const ws of conns.get(docId) ?? []) {
        if (ws !== origin && ws.readyState === WebSocket.OPEN) ws.send(message);
      }
    },
  );

  docs.set(docId, ydoc);
  conns.set(docId, new Set());
  awarenesses.set(docId, awareness);
  awarenessOwners.set(docId, new Map());
  awareness.setLocalState(null);
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
    const awareness = awarenesses.get(docId)!;
    const owners = awarenessOwners.get(docId)!;
    conns.get(docId)!.add(ws);

    ws.send(JSON.stringify({
      type: "sync",
      update: Array.from(Y.encodeStateAsUpdate(ydoc)),
    }));

    const activeClientIds = [...awareness.getStates().keys()];
    if (activeClientIds.length > 0) {
      ws.send(JSON.stringify({
        type: "awareness",
        update: Array.from(encodeAwarenessUpdate(awareness, activeClientIds)),
      }));
    }

    ws.on("message", (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "update") {
        const update = new Uint8Array(msg.update);
        Y.applyUpdate(ydoc, update, ws);
      } else if (msg.type === "awareness") {
        try {
          if (!Array.isArray(msg.update) || !msg.update.every(
            (byte: unknown) => typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255,
          )) return;

          const update = new Uint8Array(msg.update);
          const clients = getAwarenessClients(update);
          if (clients.some(({ clientId, state }) => (
            clientId === awareness.clientID ||
            (owners.has(clientId) && owners.get(clientId)!.socket !== ws) ||
            (state === null && owners.get(clientId)?.socket !== ws)
          ))) return;

          applyAwarenessUpdate(awareness, update, ws);
          for (const { clientId, state } of clients) {
            if (state !== null && awareness.states.has(clientId) && !owners.has(clientId)) {
              owners.set(clientId, {
                socket: ws,
                userId: (ws as WebSocket & { userId: string }).userId,
              });
            }
          }
        } catch {
          return;
        }
      }
    });

    ws.on("close", () => {
      conns.get(docId)?.delete(ws);
      const ownedClientIds = [...owners]
        .filter(([, owner]) => owner.socket === ws)
        .map(([clientId]) => clientId);
      const activeOwnedClientIds = ownedClientIds.filter((clientId) => awareness.states.has(clientId));
      if (activeOwnedClientIds.length > 0) {
        removeAwarenessStates(awareness, activeOwnedClientIds, ws);
      }
      for (const clientId of ownedClientIds) owners.delete(clientId);
    });
  });
}
