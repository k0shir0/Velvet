import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { xp as xpTable } from "../../../db/schema.js";

/** Cumulative MEE6-style leveling curve. */
export function levelForXp(totalXp: number): number {
  let level = 0;
  let needed = 0;
  for (;;) {
    needed += 5 * level * level + 50 * level + 100;
    if (totalXp < needed) return level;
    level += 1;
  }
}

export interface XpResult {
  xp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

/** Add XP to a user, returning the level transition (if any). */
export function addXp(guildId: string, userId: string, amount: number): XpResult {
  const row = db
    .select()
    .from(xpTable)
    .where(and(eq(xpTable.guildId, guildId), eq(xpTable.userId, userId)))
    .get();
  const previous = row?.xp ?? 0;
  const next = previous + amount;

  db.insert(xpTable)
    .values({ guildId, userId, xp: next })
    .onConflictDoUpdate({ target: [xpTable.guildId, xpTable.userId], set: { xp: next } })
    .run();

  const oldLevel = levelForXp(previous);
  const newLevel = levelForXp(next);
  return { xp: next, oldLevel, newLevel, leveledUp: newLevel > oldLevel };
}

export interface XpRow {
  userId: string;
  xp: number;
}

export function getTopXp(guildId: string, size: number): XpRow[] {
  return db
    .select()
    .from(xpTable)
    .where(eq(xpTable.guildId, guildId))
    .orderBy(desc(xpTable.xp))
    .limit(Math.min(Math.max(size, 1), 100))
    .all()
    .map((r) => ({ userId: r.userId, xp: r.xp }));
}
