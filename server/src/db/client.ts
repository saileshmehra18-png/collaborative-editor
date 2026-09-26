import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.resolve(process.env.DATABASE_PATH ?? path.join(__dirname, "../../data/app.db"));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Migrations: safe to re-run, ignores errors if column already exists
const migrations = [
  "ALTER TABLE users ADD COLUMN password_hash TEXT",
  "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT \"user\"",
];
for (const stmt of migrations) {
  try {
    db.exec(stmt);
  } catch (e: any) {
    if (!String(e.message).includes("duplicate column")) throw e;
  }
}
