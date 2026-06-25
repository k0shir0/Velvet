import {
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  type Guild,
  type Message,
  type PartialMessage,
  type VoiceState,
} from "discord.js";
import {
  AUDIT_EVENT_LABELS,
  MODULE_META,
  SocketEvents,
  auditConfigSchema,
} from "@velvet/shared";
import type { AuditConfig, AuditEvent, AuditEventType } from "@velvet/shared";
import { getIo } from "../../../api/socket.js";
import { getClient } from "../../client.js";
import type { VelvetModule } from "../../types.js";
import { getAuditConfig, setAuditConfig } from "./state.js";
import {
  cacheMessage,
  getCachedMessage,
  insertAuditEvent,
  updateCachedContent,
} from "./store.js";

const COLORS: Record<AuditEventType, number> = {
  message_delete: 0xc2243a,
  message_edit: 0xe0a106,
  voice_join: 0x4ad08a,
  voice_leave: 0x8a8a8a,
  voice_move: 0x4aa3d0,
};

function trunc(text: string | null): string {
  const value = text && text.length > 0 ? text : "—";
  return value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
}

function channelNameOf(message: Message | PartialMessage): string | null {
  const channel = message.channel;
  return channel && "name" in channel ? (channel.name ?? null) : null;
}

/* ── Recording ─────────────────────────────────────────────────────────── */

async function record(
  guild: Guild,
  partial: Omit<AuditEvent, "id" | "createdAt" | "guildId">,
): Promise<void> {
  const event = insertAuditEvent({ ...partial, guildId: guild.id, createdAt: Date.now() });
  getIo()?.emit(SocketEvents.Audit, event);
  await sendEmbed(guild, event);
}

function voiceLine(event: AuditEvent): string {
  if (event.type === "voice_join") return `🔊 Joined **${event.after}**`;
  if (event.type === "voice_leave") return `🔈 Left **${event.before}**`;
  return `🔀 **${event.before}** → **${event.after}**`;
}

async function sendEmbed(guild: Guild, event: AuditEvent): Promise<void> {
  const { logChannelId } = getAuditConfig();
  if (!logChannelId) return;
  const channel =
    guild.channels.cache.get(logChannelId) ??
    (await guild.channels.fetch(logChannelId).catch(() => null));
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(COLORS[event.type])
    .setTitle(AUDIT_EVENT_LABELS[event.type])
    .addFields({ name: "User", value: `${event.userTag} (\`${event.userId}\`)` })
    .setTimestamp(event.createdAt);

  if (event.type.startsWith("voice")) {
    embed.setDescription(voiceLine(event));
  } else if (event.type === "message_delete") {
    if (event.channelId) embed.addFields({ name: "Channel", value: `<#${event.channelId}>` });
    embed.addFields({ name: "Content", value: trunc(event.before) });
  } else if (event.type === "message_edit") {
    if (event.channelId) embed.addFields({ name: "Channel", value: `<#${event.channelId}>` });
    embed.addFields(
      { name: "Before", value: trunc(event.before) },
      { name: "After", value: trunc(event.after) },
    );
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

/* ── Listeners (stable refs so they can be detached) ───────────────────── */

function onMessageCreate(message: Message): void {
  if (!message.inGuild()) return;
  cacheMessage(message.id, {
    content: message.content,
    authorId: message.author.id,
    authorTag: message.author.tag,
    authorBot: message.author.bot,
    channelId: message.channelId,
    channelName: channelNameOf(message) ?? "",
  });
}

async function onMessageDelete(message: Message | PartialMessage): Promise<void> {
  const cfg = getAuditConfig();
  const guild = message.guild;
  if (!cfg.logDeletes || !guild) return;
  if (cfg.ignoredChannelIds.includes(message.channelId)) return;

  const cached = getCachedMessage(message.id);
  const authorBot = cached?.authorBot ?? message.author?.bot ?? false;
  if (cfg.ignoreBots && authorBot) return;

  await record(guild, {
    type: "message_delete",
    userId: cached?.authorId ?? message.author?.id ?? "unknown",
    userTag: cached?.authorTag ?? message.author?.tag ?? "Unknown User",
    channelId: message.channelId,
    channelName: cached?.channelName ?? channelNameOf(message),
    before: cached?.content ?? (message.partial ? "" : message.content),
    after: null,
  });
}

async function onMessageUpdate(
  _old: Message | PartialMessage,
  updated: Message | PartialMessage,
): Promise<void> {
  const cfg = getAuditConfig();
  const guild = updated.guild;
  if (!cfg.logEdits || !guild) return;
  if (cfg.ignoredChannelIds.includes(updated.channelId)) return;

  const full = updated.partial ? await updated.fetch().catch(() => null) : updated;
  if (!full) return;
  if (cfg.ignoreBots && full.author.bot) return;

  const before = getCachedMessage(full.id)?.content ?? "";
  const after = full.content;
  if (before === after) return; // e.g. embed/attachment-only update
  updateCachedContent(full.id, after);

  await record(guild, {
    type: "message_edit",
    userId: full.author.id,
    userTag: full.author.tag,
    channelId: full.channelId,
    channelName: channelNameOf(full),
    before,
    after,
  });
}

async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const cfg = getAuditConfig();
  if (!cfg.logVoice) return;
  const guild = newState.guild;
  const member = newState.member ?? oldState.member;
  if (!member) return;
  if (cfg.ignoreBots && member.user.bot) return;

  const oldId = oldState.channelId;
  const newId = newState.channelId;
  if (oldId === newId) return;
  if (
    (oldId && cfg.ignoredChannelIds.includes(oldId)) ||
    (newId && cfg.ignoredChannelIds.includes(newId))
  ) {
    return;
  }

  const oldName = oldState.channel?.name ?? null;
  const newName = newState.channel?.name ?? null;
  let type: AuditEventType;
  let before: string | null = null;
  let after: string | null = null;
  let channelId: string | null = null;
  if (!oldId && newId) {
    type = "voice_join";
    after = newName;
    channelId = newId;
  } else if (oldId && !newId) {
    type = "voice_leave";
    before = oldName;
    channelId = oldId;
  } else {
    type = "voice_move";
    before = oldName;
    after = newName;
    channelId = newId;
  }

  await record(guild, {
    type,
    userId: member.id,
    userTag: member.user.tag,
    channelId,
    channelName: after ?? before,
    before,
    after,
  });
}

export const auditModule: VelvetModule = {
  id: "audit",
  meta: MODULE_META.audit,
  configSchema: auditConfigSchema,
  commands: [],
  onEnable(ctx) {
    const config = ctx.config as AuditConfig;
    setAuditConfig(config);

    const client = getClient();
    if (
      (config.logDeletes || config.logEdits) &&
      !client.options.intents.has(GatewayIntentBits.MessageContent)
    ) {
      ctx.logger.warn(
        "Audit message logging needs the Message Content intent — restart the bot to capture " +
          "deleted/edited content (voice tracking works regardless).",
      );
    }

    client.on(Events.MessageCreate, onMessageCreate);
    client.on(Events.MessageDelete, onMessageDelete);
    client.on(Events.MessageUpdate, onMessageUpdate);
    client.on(Events.VoiceStateUpdate, onVoiceStateUpdate);
    ctx.logger.info("Overseer audit logging attached.");
  },
  onDisable(ctx) {
    const client = getClient();
    client.off(Events.MessageCreate, onMessageCreate);
    client.off(Events.MessageDelete, onMessageDelete);
    client.off(Events.MessageUpdate, onMessageUpdate);
    client.off(Events.VoiceStateUpdate, onVoiceStateUpdate);
    ctx.logger.info("Overseer audit logging detached.");
  },
};
