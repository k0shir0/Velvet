import { Router } from "express";
import type { ReactionRoleDeployRequest } from "@velvet/shared";
import { getClient } from "../../bot/client.js";
import {
  deleteByMessage,
  deployReactionRoles,
  listSets,
} from "../../bot/modules/engagement/reactionRoles.js";
import { env } from "../../env.js";

export const reactionRolesRouter: Router = Router();

function activeGuild() {
  const client = getClient();
  return env.GUILD_ID ? client.guilds.cache.get(env.GUILD_ID) : client.guilds.cache.first();
}

reactionRolesRouter.get("/", (_req, res) => {
  const guild = activeGuild();
  res.json({ sets: guild ? listSets(guild.id) : [] });
});

reactionRolesRouter.post("/deploy", async (req, res) => {
  const guild = activeGuild();
  if (!guild) {
    res.status(400).json({ error: "The bot isn't connected to a guild." });
    return;
  }
  const body = req.body as ReactionRoleDeployRequest | undefined;
  if (!body || !body.channelId || !Array.isArray(body.pairs)) {
    res.status(400).json({ error: "Invalid payload." });
    return;
  }
  try {
    res.json(await deployReactionRoles(guild, body));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

reactionRolesRouter.delete("/:messageId", (req, res) => {
  deleteByMessage(req.params.messageId);
  res.json({ ok: true });
});
