import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  type Role,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types.js";

interface RoleDef {
  name: string;
  color: number;
  permissions: bigint[];
}

const BLUEPRINT: RoleDef[] = [
  { name: "Admin", color: 0xc2243a, permissions: [PermissionFlagsBits.Administrator] },
  {
    name: "Moderator",
    color: 0xe0a106,
    permissions: [
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageChannels,
    ],
  },
  { name: "Trusted", color: 0x4aa3d0, permissions: [PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
  { name: "Member", color: 0x9aa0a6, permissions: [] },
  { name: "Muted", color: 0x4b4b4b, permissions: [] },
];

export const blueprintCommand: SlashCommand = {
  name: "roleblueprint",
  data: new SlashCommandBuilder()
    .setName("roleblueprint")
    .setDescription("Create a hierarchical role structure (Admin → Moderator → Trusted → Member → Muted)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Server only.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;

    const created: string[] = [];
    const skipped: string[] = [];
    let mutedRole: Role | null = null;

    for (const def of BLUEPRINT) {
      const existing = guild.roles.cache.find((r) => r.name === def.name);
      if (existing) {
        skipped.push(def.name);
        if (def.name === "Muted") mutedRole = existing;
        continue;
      }
      const role = await guild.roles
        .create({
          name: def.name,
          color: def.color,
          permissions: def.permissions,
          reason: "Velvet role blueprint",
        })
        .catch(() => null);
      if (role) {
        created.push(def.name);
        if (def.name === "Muted") mutedRole = role;
      }
    }

    // Deny the Muted role from speaking/posting across all channels.
    if (mutedRole) {
      for (const channel of guild.channels.cache.values()) {
        if (!("permissionOverwrites" in channel)) continue;
        await channel.permissionOverwrites
          .edit(mutedRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
            Connect: false,
          })
          .catch(() => {});
      }
    }

    await interaction.editReply(
      `🏗️ Role blueprint complete.\n**Created:** ${created.join(", ") || "none"}\n**Already existed:** ${
        skipped.join(", ") || "none"
      }`,
    );
  },
};
