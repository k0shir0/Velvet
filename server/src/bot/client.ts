import { Client, GatewayIntentBits } from "discord.js";

let instance: Client | null = null;

/**
 * Construct the shared discord.js client with the given gateway intents
 * (computed from enabled modules — see `computeIntents`). Privileged intents
 * are only ever included when a feature needs them, so the bot logs in
 * barebones by default.
 */
export function initClient(intents: GatewayIntentBits[]): Client {
  instance = new Client({
    intents: intents.length > 0 ? intents : [GatewayIntentBits.Guilds],
  });
  return instance;
}

export function getClient(): Client {
  if (!instance) {
    throw new Error("Discord client not initialized — call initClient() first.");
  }
  return instance;
}
