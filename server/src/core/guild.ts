import { ChannelType } from "discord.js";
import type { GuildChannelInfo, GuildInfo } from "@velvet/shared";
import { getClient } from "../bot/client.js";
import { env } from "../env.js";

function mapType(type: ChannelType): GuildChannelInfo["type"] {
  if (type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement) return "text";
  if (type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice) return "voice";
  if (type === ChannelType.GuildCategory) return "category";
  return "other";
}

/** The configured guild's channels + roles, for the dashboard config dropdowns. */
export function getGuildInfo(): GuildInfo {
  const client = getClient();
  const guild = env.GUILD_ID
    ? client.guilds.cache.get(env.GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) return { available: false, name: null, channels: [], roles: [] };

  const channels: GuildChannelInfo[] = [...guild.channels.cache.values()]
    .map((c) => ({ id: c.id, name: c.name, type: mapType(c.type) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id) // drop @everyone
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name }));

  return { available: true, name: guild.name, channels, roles };
}
