import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { warns } from "../../../db/schema.js";

export interface WarnRecord {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: number;
}

export function addWarn(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string,
): number {
  db.insert(warns)
    .values({ guildId, userId, moderatorId, reason, createdAt: Date.now() })
    .run();
  return countWarns(guildId, userId);
}

export function countWarns(guildId: string, userId: string): number {
  return db
    .select()
    .from(warns)
    .where(and(eq(warns.guildId, guildId), eq(warns.userId, userId)))
    .all().length;
}

export function listWarns(guildId: string, userId: string): WarnRecord[] {
  return db
    .select()
    .from(warns)
    .where(and(eq(warns.guildId, guildId), eq(warns.userId, userId)))
    .orderBy(desc(warns.createdAt))
    .all();
}
