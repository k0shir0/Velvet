import {
  AttachmentBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
  MessageFlags,
  type Message,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types.js";
import { getUtilitiesConfig } from "./state.js";

const HARD_CAP = 5000;

async function fetchMessages(channel: GuildTextBasedChannel, limit: number): Promise<Message[]> {
  const collected: Message[] = [];
  let before: string | undefined;
  while (collected.length < limit) {
    const batch = await channel.messages.fetch({
      limit: Math.min(100, limit - collected.length),
      before,
    });
    if (batch.size === 0) break;
    const arr = [...batch.values()];
    collected.push(...arr);
    before = arr[arr.length - 1]?.id;
    if (batch.size < 100) break;
  }
  return collected.reverse(); // oldest → newest
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(guildName: string, channelName: string, messages: Message[]): string {
  const rows = messages
    .map((m) => {
      const time = new Date(m.createdTimestamp).toLocaleString();
      const content = m.content ? escapeHtml(m.content).replace(/\n/g, "<br>") : "<i>[no text]</i>";
      const attachments = [...m.attachments.values()]
        .map((a) => `<a href="${escapeHtml(a.url)}">📎 ${escapeHtml(a.name)}</a>`)
        .join(" ");
      return `<div class="msg"><div class="meta"><span class="author">${escapeHtml(
        m.author.tag,
      )}</span><span class="time">${escapeHtml(time)}</span></div><div class="content">${content}${
        attachments ? `<div class="att">${attachments}</div>` : ""
      }</div></div>`;
    })
    .join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>#${escapeHtml(channelName)} — transcript</title>
<style>
  body{background:#0d0a0b;color:#f3e9ec;font-family:"Segoe UI",system-ui,sans-serif;margin:0;padding:24px}
  .head{border-bottom:2px solid #c2243a;padding-bottom:14px;margin-bottom:18px}
  .head h1{margin:0;font-size:20px}.head p{margin:4px 0 0;color:#b193a0;font-size:13px}
  .msg{padding:10px 0;border-bottom:1px solid rgba(194,36,58,.12)}
  .meta{display:flex;gap:10px;align-items:baseline}
  .author{color:#c2243a;font-weight:600}.time{color:#6f5860;font-size:12px}
  .content{margin-top:3px;font-size:14px;line-height:1.5;word-break:break-word}
  .att{margin-top:5px}.att a{color:#7ec2ee;text-decoration:none;font-size:13px;margin-right:8px}
</style></head><body>
<div class="head"><h1>#${escapeHtml(channelName)}</h1>
<p>${escapeHtml(guildName)} · ${messages.length} messages · generated ${escapeHtml(
    new Date().toLocaleString(),
  )}</p></div>
${rows}
</body></html>`;
}

export const archiveCommand: SlashCommand = {
  name: "archive",
  data: new SlashCommandBuilder()
    .setName("archive")
    .setDescription("Generate an HTML transcript of a channel")
    .addBooleanOption((o) =>
      o.setName("deep").setDescription("Archive the full channel history (up to 5000)"),
    )
    .addIntegerOption((o) =>
      o
        .setName("limit")
        .setDescription("Most recent messages to capture (Targeted Capture)")
        .setMinValue(1)
        .setMaxValue(HARD_CAP),
    )
    .addUserOption((o) => o.setName("user").setDescription("Only include this user's messages"))
    .addChannelOption((o) =>
      o.setName("channel").setDescription("Channel to archive (defaults to current)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Server only.", flags: MessageFlags.Ephemeral });
      return;
    }
    const target = interaction.options.getChannel("channel") ?? interaction.channel;
    if (!target || !target.isTextBased() || target.isDMBased()) {
      await interaction.reply({ content: "Pick a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const cfg = getUtilitiesConfig();
    const deep = interaction.options.getBoolean("deep") ?? false;
    const limit = deep ? HARD_CAP : interaction.options.getInteger("limit") ?? cfg.archiveDefaultLimit;
    const user = interaction.options.getUser("user");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let messages = await fetchMessages(target, limit);
    if (user) messages = messages.filter((m) => m.author.id === user.id);

    const html = buildHtml(interaction.guild.name, target.name, messages);
    const file = new AttachmentBuilder(Buffer.from(html, "utf8"), {
      name: `archive-${target.name}-${Date.now()}.html`,
    });

    await interaction.editReply({
      content: `🗂️ Archived **${messages.length}** message${messages.length === 1 ? "" : "s"} from <#${target.id}>.`,
      files: [file],
    });
  },
};
