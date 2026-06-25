import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../env.js";
import * as schema from "./schema.js";

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

/**
 * Create tables if they don't exist. Phase 1 bootstraps the schema directly;
 * later phases can adopt drizzle-kit migrations (see drizzle.config.ts).
 */
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id      TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS module_config (
      module_id TEXT PRIMARY KEY,
      config    TEXT NOT NULL
    );
  `);
}
