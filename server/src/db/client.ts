import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(__dirname, "../../data/app.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);
