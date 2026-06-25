import { Client, GatewayIntentBits } from "discord.js";

/**
 * The shared discord.js client. Phase 1 only requests the non-privileged
 * `Guilds` intent so the bot can log in without any portal configuration.
 * Later modules add intents (GuildMembers, MessageContent, GuildVoiceStates,
 * …) — those are privileged and must be enabled in the Developer Portal.
 */
export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
