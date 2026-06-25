import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types.js";
import { logModAction } from "./modlog.js";
import { addWarn } from "./warns.js";

const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

/** Reply with an ephemeral error and return false when not in a guild. */
function requireGuild(interaction: ChatInputCommandInteraction) {
  if (interaction.inCachedGuild()) return true;
  void interaction.reply({ content: "This command can only be used in a server.", ...EPHEMERAL });
  return false;
}

const kick: SlashCommand = {
  name: "kick",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((o) => o.setName("user").setDescription("Member to kick").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "That user isn't in this server.", ...EPHEMERAL });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ content: "I can't kick that member (role hierarchy or permissions).", ...EPHEMERAL });
      return;
    }
    await member.kick(reason);
    await interaction.reply({ content: `👢 Kicked **${user.tag}** — ${reason}` });
    await logModAction(interaction.guild, "Member Kicked", user, interaction.user, reason);
  },
};

const ban: SlashCommand = {
  name: "ban",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban"))
    .addIntegerOption((o) =>
      o
        .setName("delete_days")
        .setDescription("Delete this many days of their messages (0-7)")
        .setMinValue(0)
        .setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({ content: "I can't ban that member (role hierarchy or permissions).", ...EPHEMERAL });
      return;
    }
    await interaction.guild.bans.create(user.id, {
      reason,
      deleteMessageSeconds: deleteDays * 86400,
    });
    await interaction.reply({ content: `🔨 Banned **${user.tag}** — ${reason}` });
    await logModAction(interaction.guild, "Member Banned", user, interaction.user, reason);
  },
};

const unban: SlashCommand = {
  name: "unban",
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by their ID")
    .addStringOption((o) => o.setName("user_id").setDescription("ID of the user to unban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the unban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      await interaction.reply({ content: "That user isn't banned (or the ID is invalid).", ...EPHEMERAL });
      return;
    }
    await interaction.guild.bans.remove(userId, reason);
    await interaction.reply({ content: `♻️ Unbanned **${ban.user.tag}** — ${reason}` });
    await logModAction(interaction.guild, "Member Unbanned", ban.user, interaction.user, reason);
  },
};

const timeout: SlashCommand = {
  name: "timeout",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member for a number of minutes")
    .addUserOption((o) => o.setName("user").setDescription("Member to time out").setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("Duration in minutes (max 40320 = 28 days)")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the timeout"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const user = interaction.options.getUser("user", true);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason") ?? "No reason provided";

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "That user isn't in this server.", ...EPHEMERAL });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: "I can't time out that member (role hierarchy or permissions).", ...EPHEMERAL });
      return;
    }
    await member.timeout(minutes * 60_000, reason);
    await interaction.reply({ content: `🔇 Timed out **${user.tag}** for ${minutes} min — ${reason}` });
    await logModAction(interaction.guild, "Member Timed Out", user, interaction.user, reason, `${minutes} minutes`);
  },
};

const warn: SlashCommand = {
  name: "warn",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a member")
    .addUserOption((o) => o.setName("user").setDescription("Member to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    const total = addWarn(interaction.guild.id, user.id, interaction.user.id, reason);
    await user
      .send(`You were warned in **${interaction.guild.name}**: ${reason} (warning #${total})`)
      .catch(() => {});
    await interaction.reply({ content: `⚠️ Warned **${user.tag}** — ${reason} (total: ${total})` });
    await logModAction(interaction.guild, "Member Warned", user, interaction.user, reason, `Total warnings: ${total}`);
  },
};

const lockdown: SlashCommand = {
  name: "lockdown",
  data: new SlashCommandBuilder()
    .setName("lockdown")
    .setDescription("Lock or unlock a channel for @everyone")
    .addStringOption((o) =>
      o
        .setName("action")
        .setDescription("Lock or unlock")
        .setRequired(true)
        .addChoices({ name: "lock", value: "lock" }, { name: "unlock", value: "unlock" }),
    )
    .addChannelOption((o) =>
      o.setName("channel").setDescription("Channel to lock (defaults to current)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const action = interaction.options.getString("action", true);
    const target = interaction.options.getChannel("channel") ?? interaction.channel;
    if (!target || !("permissionOverwrites" in target)) {
      await interaction.reply({ content: "Pick a channel that supports permissions.", ...EPHEMERAL });
      return;
    }
    const lock = action === "lock";
    await target.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: lock ? false : null,
    });
    await interaction.reply({
      content: `${lock ? "🔒 Locked" : "🔓 Unlocked"} <#${target.id}>.`,
    });
  },
};

const purge: SlashCommand = {
  name: "purge",
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk-delete recent messages (last 14 days)")
    .addIntegerOption((o) =>
      o
        .setName("count")
        .setDescription("How many messages to scan/delete (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return void requireGuild(interaction);
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "This isn't a text channel.", ...EPHEMERAL });
      return;
    }
    const count = interaction.options.getInteger("count", true);
    const user = interaction.options.getUser("user");

    await interaction.deferReply(EPHEMERAL);
    const fetched = await channel.messages.fetch({ limit: 100 });
    let targets = [...fetched.values()];
    if (user) targets = targets.filter((m) => m.author.id === user.id);
    targets = targets.slice(0, count);

    const deleted = await channel.bulkDelete(targets, true);
    await interaction.editReply(
      `🧹 Deleted ${deleted.size} message${deleted.size === 1 ? "" : "s"}${
        user ? ` from **${user.tag}**` : ""
      }.`,
    );
  },
};

export const moderationCommands: SlashCommand[] = [
  kick,
  ban,
  unban,
  timeout,
  warn,
  lockdown,
  purge,
];
