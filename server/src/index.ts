import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { attachWsServer, shutdownWebSocketServer } from "./ws/server";
import documentsRouter from "./routes/documents";
import authRouter from "./routes/auth";
import { assertAuthConfig } from "./services/auth";
import { db, initializeDatabase } from "./db/client";

assertAuthConfig();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
}));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Serve client static files in production
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));

// SPA fallback: serve index.html for all non-API GET requests (client-side routing)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(clientDist, "index.html"));
  }
  next();
});

const server = http.createServer(app);
attachWsServer(server);

const PORT = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid TCP port number");
}
let shutdownRequested = false;
async function startServer(): Promise<void> {
  await initializeDatabase();
  if (shutdownRequested) return;
  server.listen(PORT, () => console.log(`Backend running on :${PORT}`));
}

let shutdownPromise: Promise<void> | undefined;
function shutdown(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  shutdownRequested = true;

  shutdownPromise = (async () => {
    const httpClosed = new Promise<void>((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close((error) => error ? reject(error) : resolve());
    });

    await shutdownWebSocketServer();
    await httpClosed;
    await db.end();
  })();

  return shutdownPromise;
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void shutdown().catch((error: unknown) => {
      console.error("Failed to shut down cleanly", error);
      process.exitCode = 1;
    });
  });
}

void startServer().catch(async (error: unknown) => {
  if (shutdownRequested) return;
  console.error("Failed to initialize the database", error);
  await db.end();
  process.exitCode = 1;
});
