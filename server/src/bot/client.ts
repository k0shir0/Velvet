import { Client, GatewayIntentBits } from "discord.js";

let instance: Client | null = null;

/**
 * Construct the shared discord.js client.
 *
 * `Guilds` + `GuildMessages` are non-privileged, so the bot logs in barebones
 * with zero portal setup. `MessageContent` IS privileged and is only added
 * (via `extraIntents`) when automod is enabled — keeping the bot opt-in and
 * avoiding a login failure for users who don't use automod.
 */
export function initClient(extraIntents: GatewayIntentBits[] = []): Client {
  instance = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      ...extraIntents,
    ],
  });
  return instance;
}

export function getClient(): Client {
  if (!instance) {
    throw new Error("Discord client not initialized — call initClient() first.");
  }
  return instance;
}
