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
    CREATE TABLE IF NOT EXISTS warns (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id     TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason       TEXT NOT NULL,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_warns_guild_user ON warns (guild_id, user_id);
    CREATE TABLE IF NOT EXISTS audit_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id     TEXT NOT NULL,
      type         TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      user_tag     TEXT NOT NULL,
      channel_id   TEXT,
      channel_name TEXT,
      before       TEXT,
      after        TEXT,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_guild_time ON audit_events (guild_id, created_at);
    CREATE TABLE IF NOT EXISTS xp (
      guild_id TEXT NOT NULL,
      user_id  TEXT NOT NULL,
      xp       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS reaction_roles (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id   TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji      TEXT NOT NULL,
      role_id    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rr_message ON reaction_roles (message_id);
  `);
}
