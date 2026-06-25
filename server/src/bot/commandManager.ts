import { REST, Routes } from "discord.js";
import { env } from "../env.js";
import { createLogger } from "../logger.js";
import { getEnabledModules } from "./moduleRegistry.js";

const log = createLogger("commands");

/**
 * Registers the slash commands of all currently-enabled modules to the
 * configured guild (instant updates). Called after every Apply.
 */
export async function refreshCommands(): Promise<void> {
  if (!env.TOKEN || !env.CLIENT_ID || !env.GUILD_ID) {
    log.warn("Skipping slash-command registration (missing TOKEN/CLIENT_ID/GUILD_ID).");
    return;
  }

  const commands = getEnabledModules()
    .flatMap((m) => m.commands ?? [])
    .map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(env.TOKEN);
  await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
    body: commands,
  });
  log.info(`Registered ${commands.length} guild slash command(s).`);
}
