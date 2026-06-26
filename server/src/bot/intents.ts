import { GatewayIntentBits } from "discord.js";
import type { ModuleState } from "@velvet/shared";

/**
 * Compute the gateway intents the bot needs given the currently-enabled
 * modules. Privileged intents (Message Content) are only requested when a
 * feature actually needs them, so the bot logs in barebones by default.
 */
export function computeIntents(states: ModuleState[]): GatewayIntentBits[] {
  const intents = new Set<GatewayIntentBits>([
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]);

  const moderation = states.find((s) => s.id === "moderation");
  if (moderation?.enabled && (moderation.config as { automodEnabled?: boolean }).automodEnabled) {
    intents.add(GatewayIntentBits.MessageContent);
  }

  const audit = states.find((s) => s.id === "audit");
  if (audit?.enabled) {
    const cfg = audit.config as { logVoice?: boolean; logDeletes?: boolean; logEdits?: boolean };
    intents.add(GatewayIntentBits.GuildVoiceStates);
    if (cfg.logDeletes || cfg.logEdits) intents.add(GatewayIntentBits.MessageContent);
  }

  const engagement = states.find((s) => s.id === "engagement");
  if (engagement?.enabled) {
    intents.add(GatewayIntentBits.GuildVoiceStates);
    intents.add(GatewayIntentBits.GuildMessageReactions);
  }

  return [...intents];
}
