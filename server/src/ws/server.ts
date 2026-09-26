import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { loadDocState, saveUpdate } from "../services/persistence";

const docs = new Map<string, Y.Doc>();
const conns = new Map<string, Set<WebSocket>>();

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

    if (!docId) {
      ws.close(1008, "docId required");
      return;
    }

    const ydoc = getOrCreateDoc(docId);
    conns.get(docId)!.add(ws);

    ws.send(JSON.stringify({
      type: "sync",
      update: Array.from(Y.encodeStateAsUpdate(ydoc)),
    }));

    ws.on("message", (raw: Buffer) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "update") {
        const update = new Uint8Array(msg.update);
        Y.applyUpdate(ydoc, update, ws);
      }
    });

    ws.on("close", () => {
      conns.get(docId)?.delete(ws);
    });
  });
}
