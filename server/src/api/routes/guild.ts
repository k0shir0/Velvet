import { Router } from "express";
import { getGuildInfo } from "../../core/guild.js";

export const guildRouter: Router = Router();

guildRouter.get("/", (_req, res) => {
  res.json(getGuildInfo());
});
