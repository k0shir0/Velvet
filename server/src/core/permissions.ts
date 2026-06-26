import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { ChannelPermissionInfo, PermissionAudit } from "@velvet/shared";
import { getClient } from "../bot/client.js";
import { env } from "../env.js";

function mapType(type: ChannelType): ChannelPermissionInfo["type"] {
  if (type === ChannelType.GuildCategory) return "category";
  if (type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement) return "text";
  if (type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice) return "voice";
  return "other";
}

/**
 * A breakdown of every channel and which roles can view the private ones —
 * powers the dashboard Permission Auditor.
 */
export function getPermissionAudit(): PermissionAudit {
  const client = getClient();
  const guild = env.GUILD_ID
    ? client.guilds.cache.get(env.GUILD_ID)
    : client.guilds.cache.first();
  if (!guild) return { available: false, channels: [] };

  const everyoneId = guild.id;
  const channels: ChannelPermissionInfo[] = [];

  for (const channel of guild.channels.cache.values()) {
    if (!("permissionOverwrites" in channel)) continue;

    const everyoneDenied =
      channel.permissionOverwrites.cache
        .get(everyoneId)
        ?.deny.has(PermissionFlagsBits.ViewChannel) ?? false;

    const allowedRoles = everyoneDenied
      ? [...guild.roles.cache.values()]
          .filter(
            (r) =>
              r.id !== everyoneId &&
              channel.permissionsFor(r).has(PermissionFlagsBits.ViewChannel),
          )
          .sort((a, b) => b.position - a.position)
          .map((r) => ({ id: r.id, name: r.name }))
      : [];

    channels.push({
      id: channel.id,
      name: channel.name,
      type: mapType(channel.type),
      parentId: channel.parentId ?? null,
      position: channel.rawPosition,
      private: everyoneDenied,
      allowedRoles,
    });
  }

  return { available: true, channels };
}
