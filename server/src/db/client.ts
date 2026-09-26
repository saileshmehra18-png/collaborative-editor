import fs from "fs";
import path from "path";
import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initializeDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured");
  }

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await db.query(schema);
}
