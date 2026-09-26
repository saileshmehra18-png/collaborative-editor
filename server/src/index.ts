import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import { attachWsServer } from "./ws/server";
import documentsRouter from "./routes/documents";
import authRouter from "./routes/auth";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);

const server = http.createServer(app);
attachWsServer(server);

const PORT = process.env.PORT ?? 4000;
server.listen(PORT, () => console.log(`Backend running on :${PORT}`));
