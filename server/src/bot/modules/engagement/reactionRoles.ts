import {
  EmbedBuilder,
  type Guild,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import { eq } from "drizzle-orm";
import type {
  ReactionRoleDeployRequest,
  ReactionRoleSet,
} from "@velvet/shared";
import { db } from "../../../db/client.js";
import { reactionRoles } from "../../../db/schema.js";

/* ── DB helpers ────────────────────────────────────────────────────────── */

function getByMessage(messageId: string) {
  return db.select().from(reactionRoles).where(eq(reactionRoles.messageId, messageId)).all();
}

export function listSets(guildId: string): ReactionRoleSet[] {
  const rows = db.select().from(reactionRoles).where(eq(reactionRoles.guildId, guildId)).all();
  const byMessage = new Map<string, ReactionRoleSet>();
  for (const r of rows) {
    const set = byMessage.get(r.messageId) ?? {
      messageId: r.messageId,
      channelId: r.channelId,
      pairs: [],
    };
    set.pairs.push({ emoji: r.emoji, roleId: r.roleId });
    byMessage.set(r.messageId, set);
  }
  return [...byMessage.values()];
}

export function deleteByMessage(messageId: string): void {
  db.delete(reactionRoles).where(eq(reactionRoles.messageId, messageId)).run();
}

/* ── Deploy ────────────────────────────────────────────────────────────── */

export async function deployReactionRoles(
  guild: Guild,
  req: ReactionRoleDeployRequest,
): Promise<ReactionRoleSet> {
  if (req.pairs.length === 0) throw new Error("Add at least one emoji → role pair.");
  const channel =
    guild.channels.cache.get(req.channelId) ??
    (await guild.channels.fetch(req.channelId).catch(() => null));
  if (!channel?.isTextBased()) throw new Error("Pick a valid text channel.");

  const embed = new EmbedBuilder()
    .setColor(0xc2243a)
    .setTitle(req.title?.trim() || "Reaction Roles")
    .setDescription(
      [
        req.description?.trim(),
        "",
        ...req.pairs.map((p) => `${p.emoji} — <@&${p.roleId}>`),
      ]
        .filter((l) => l !== undefined)
        .join("\n"),
    );

  const message = await channel.send({ embeds: [embed] });
  for (const pair of req.pairs) {
    await message.react(pair.emoji).catch(() => {});
    db.insert(reactionRoles)
      .values({
        guildId: guild.id,
        channelId: req.channelId,
        messageId: message.id,
        emoji: pair.emoji,
        roleId: pair.roleId,
      })
      .run();
  }

  return { messageId: message.id, channelId: req.channelId, pairs: req.pairs };
}

/* ── Listeners ─────────────────────────────────────────────────────────── */

async function resolve(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  apply: "add" | "remove",
): Promise<void> {
  if (user.bot) return;
  if (reaction.partial) {
    if (!(await reaction.fetch().catch(() => null))) return;
  }
  const rows = getByMessage(reaction.message.id);
  if (rows.length === 0) return;

  const emoji = reaction.emoji.name;
  const match = rows.find((r) => r.emoji === emoji);
  if (!match) return;

  const guild = reaction.message.guild;
  if (!guild) return;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  if (apply === "add") await member.roles.add(match.roleId).catch(() => {});
  else await member.roles.remove(match.roleId).catch(() => {});
}

export function onReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): void {
  void resolve(reaction, user, "add");
}

export function onReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): void {
  void resolve(reaction, user, "remove");
}
