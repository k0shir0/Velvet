import { Events, type Message } from "discord.js";
import { MODULE_META, engagementConfigSchema } from "@velvet/shared";
import type { EngagementConfig } from "@velvet/shared";
import { getClient } from "../../client.js";
import type { VelvetModule } from "../../types.js";
import { blueprintCommand } from "./blueprint.js";
import { onReactionAdd, onReactionRemove } from "./reactionRoles.js";
import { startStats, stopStats } from "./stats.js";
import { getEngagementConfig, setEngagementConfig } from "./state.js";
import { addXp } from "./xp.js";

const MESSAGE_COOLDOWN_MS = 60_000;
const messageCooldown = new Map<string, number>();
let voiceTimer: ReturnType<typeof setInterval> | null = null;

async function announceLevelUp(message: Message<true>, level: number): Promise<void> {
  const cfg = getEngagementConfig();
  if (!cfg.announceLevelUp) return;
  const text = cfg.levelUpMessage
    .replace("{user}", `<@${message.author.id}>`)
    .replace("{level}", String(level));
  const channel = cfg.levelUpChannelId
    ? message.guild.channels.cache.get(cfg.levelUpChannelId)
    : message.channel;
  if (channel?.isTextBased()) await channel.send(text).catch(() => {});
}

function onMessageCreate(message: Message): void {
  if (message.author.bot || !message.inGuild()) return;
  const cfg = getEngagementConfig();
  if (cfg.ignoredChannelIds.includes(message.channelId)) return;

  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  if (now - (messageCooldown.get(key) ?? 0) < MESSAGE_COOLDOWN_MS) return;
  messageCooldown.set(key, now);

  const result = addXp(message.guildId, message.author.id, cfg.xpPerMessage);
  if (result.leveledUp) void announceLevelUp(message, result.newLevel);
}

function awardVoiceXp(): void {
  const cfg = getEngagementConfig();
  if (cfg.xpPerVoiceMinute <= 0) return;
  const client = getClient();
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased() || channel.id === guild.afkChannelId) continue;
      for (const member of channel.members.values()) {
        if (member.user.bot) continue;
        addXp(guild.id, member.id, cfg.xpPerVoiceMinute);
      }
    }
  }
}

export const engagementModule: VelvetModule = {
  id: "engagement",
  meta: MODULE_META.engagement,
  configSchema: engagementConfigSchema,
  commands: [blueprintCommand],
  onEnable(ctx) {
    const config = ctx.config as EngagementConfig;
    setEngagementConfig(config);

    const client = getClient();
    client.on(Events.MessageCreate, onMessageCreate);
    client.on(Events.MessageReactionAdd, onReactionAdd);
    client.on(Events.MessageReactionRemove, onReactionRemove);
    voiceTimer = setInterval(awardVoiceXp, 60_000);
    startStats(ctx.logger);

    ctx.logger.info("Server engagement armed (XP, reaction roles, server stats, /roleblueprint).");
  },
  onDisable(ctx) {
    const client = getClient();
    client.off(Events.MessageCreate, onMessageCreate);
    client.off(Events.MessageReactionAdd, onReactionAdd);
    client.off(Events.MessageReactionRemove, onReactionRemove);
    if (voiceTimer) {
      clearInterval(voiceTimer);
      voiceTimer = null;
    }
    stopStats();
    ctx.logger.info("Server engagement disarmed.");
  },
};
