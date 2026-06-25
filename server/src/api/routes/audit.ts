import { Router } from "express";
import type { AuditEventType } from "@velvet/shared";
import { getClient } from "../../bot/client.js";
import { queryAuditEvents } from "../../bot/modules/audit/store.js";
import { env } from "../../env.js";

export const auditRouter: Router = Router();

auditRouter.get("/", (req, res) => {
  const guildId = env.GUILD_ID ?? getClient().guilds.cache.first()?.id;
  if (!guildId) {
    res.json({ events: [] });
    return;
  }
  const type = (req.query.type as AuditEventType | undefined) || undefined;
  const userId = (req.query.userId as string | undefined) || undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  res.json({ events: queryAuditEvents(guildId, { type, userId, limit }) });
});
