import { Router } from "express";
import type { LeaderboardEntry } from "@velvet/shared";
import { getClient } from "../../bot/client.js";
import { getEngagementConfig } from "../../bot/modules/engagement/state.js";
import { getTopXp, levelForXp } from "../../bot/modules/engagement/xp.js";
import { env } from "../../env.js";

export const leaderboardRouter: Router = Router();

leaderboardRouter.get("/", async (_req, res) => {
  const client = getClient();
  const guild = env.GUILD_ID
    ? client.guilds.cache.get(env.GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) {
    res.json({ entries: [] });
    return;
  }

  const size = getEngagementConfig().leaderboardSize;
  const rows = getTopXp(guild.id, size);
  const entries: LeaderboardEntry[] = [];
  let rank = 1;
  for (const row of rows) {
    const user =
      client.users.cache.get(row.userId) ??
      (await client.users.fetch(row.userId).catch(() => null));
    entries.push({
      rank: rank++,
      userId: row.userId,
      tag: user?.tag ?? row.userId,
      xp: row.xp,
      level: levelForXp(row.xp),
    });
  }
  res.json({ entries });
});
