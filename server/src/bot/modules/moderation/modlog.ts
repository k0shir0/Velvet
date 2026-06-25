import { EmbedBuilder, type Guild, type User } from "discord.js";
import { getModerationConfig } from "./state.js";

const CRIMSON = 0xc2243a;

/** Post a moderation action to the configured mod-log channel, if set. */
export async function logModAction(
  guild: Guild,
  action: string,
  target: User,
  moderator: User,
  reason: string,
  extra?: string,
): Promise<void> {
  const { modLogChannelId } = getModerationConfig();
  if (!modLogChannelId) return;

  const channel =
    guild.channels.cache.get(modLogChannelId) ??
    (await guild.channels.fetch(modLogChannelId).catch(() => null));
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(CRIMSON)
    .setAuthor({ name: `${action}`, iconURL: target.displayAvatarURL() })
    .addFields(
      { name: "User", value: `${target.tag} (\`${target.id}\`)`, inline: true },
      { name: "Moderator", value: moderator.tag, inline: true },
      { name: "Reason", value: reason || "No reason provided" },
    )
    .setTimestamp();
  if (extra) embed.addFields({ name: "Details", value: extra });

  await channel.send({ embeds: [embed] }).catch(() => {});
}
