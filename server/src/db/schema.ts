import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Enabled/disabled state for each module. */
export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
});

/** JSON-encoded config blob for each module. */
export const moduleConfig = sqliteTable("module_config", {
  moduleId: text("module_id").primaryKey(),
  config: text("config", { mode: "json" }).notNull(),
});

/** Moderation warnings (Phase 2 — Moderation Core). */
export const warns = sqliteTable("warns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at").notNull(),
});

/** XP per user per guild (Phase 5 — Engagement). */
export const xp = sqliteTable("xp", {
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  xp: integer("xp").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.userId] }),
}));

/** Reaction-role mappings (Phase 5 — Engagement). */
export const reactionRoles = sqliteTable("reaction_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id").notNull(),
  emoji: text("emoji").notNull(),
  roleId: text("role_id").notNull(),
});

/** Audit events (Phase 3 — the Overseer). */
export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  type: text("type").notNull(),
  userId: text("user_id").notNull(),
  userTag: text("user_tag").notNull(),
  channelId: text("channel_id"),
  channelName: text("channel_name"),
  before: text("before"),
  after: text("after"),
  createdAt: integer("created_at").notNull(),
});
