import type { Guild } from "discord.js";
import type { Logger } from "../../../logger.js";
import { env } from "../../../env.js";
import { getClient } from "../../client.js";
import { getEngagementConfig } from "./state.js";

let timer: ReturnType<typeof setInterval> | null = null;

function countInVoice(guild: Guild): number {
  let count = 0;
  for (const channel of guild.channels.cache.values()) {
    if (channel.isVoiceBased()) {
      count += channel.members.filter((m) => !m.user.bot).size;
    }
  }
  return count;
}

async function update(): Promise<void> {
  const client = getClient();
  if (!client.isReady()) return;
  const cfg = getEngagementConfig();
  const guild = env.GUILD_ID
    ? client.guilds.cache.get(env.GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) return;

  if (cfg.statMembersChannelId) {
    const channel = guild.channels.cache.get(cfg.statMembersChannelId);
    if (channel) {
      await channel
        .setName(cfg.statMembersTemplate.replace("{count}", String(guild.memberCount)))
        .catch(() => {});
    }
  }
  if (cfg.statVoiceChannelId) {
    const channel = guild.channels.cache.get(cfg.statVoiceChannelId);
    if (channel) {
      await channel
        .setName(cfg.statVoiceTemplate.replace("{count}", String(countInVoice(guild))))
        .catch(() => {});
    }
  }
}

/**
 * Dynamic server-stat channels. Discord rate-limits channel renames hard
 * (~2 per 10 min), so we update every 10 minutes.
 */
export function startStats(logger: Logger): void {
  stopStats();
  const cfg = getEngagementConfig();
  if (!cfg.statMembersChannelId && !cfg.statVoiceChannelId) return;
  void update();
  timer = setInterval(() => void update(), 10 * 60 * 1000);
  logger.info("Dynamic server-stat channels started (every 10 min).");
}

export function stopStats(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
