import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────────
 * Modules
 *
 * The four top-level modules from the blueprint. Each is independently
 * toggleable and ships disabled by default. Sub-features are layered into
 * each module's config schema in later phases.
 * ──────────────────────────────────────────────────────────────────────── */

export const MODULE_IDS = [
  "moderation",
  "audit",
  "utilities",
  "engagement",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleMeta {
  id: ModuleId;
  name: string;
  description: string;
  /** Bullet list of sub-features, surfaced on the dashboard card. */
  features: string[];
}

export const MODULE_META: Record<ModuleId, ModuleMeta> = {
  moderation: {
    id: "moderation",
    name: "Moderation Core & Automod",
    description:
      "Essential staff tools plus a configurable automod engine and advanced purge.",
    features: [
      "/kick, /ban, /unban, /timeout, /warn, /lockdown",
      "Spam detection + link filtering + word blacklist",
      "Advanced purge by count, time, or user",
    ],
  },
  audit: {
    id: "audit",
    name: "Advanced Audit Logging",
    description:
      "The Overseer — a cleaner, highly detailed audit log routed to a staff channel.",
    features: [
      "Deleted-message content retention",
      "Edited-message before/after view",
      "Voice join / leave / move tracking",
    ],
  },
  utilities: {
    id: "utilities",
    name: "Core Utilities & Automation",
    description:
      "Server archiving, hardware-synced presence, and a visual permission auditor.",
    features: [
      "HTML transcript archiver",
      "Hardware-synced rich presence (CPU / RAM / Net)",
      "Channel & role permission auditor",
    ],
  },
  engagement: {
    id: "engagement",
    name: "Server Engagement",
    description:
      "XP & leveling, reaction roles, live server stats, and role blueprinting.",
    features: [
      "Unified text + voice XP and leaderboard",
      "Interactive reaction roles",
      "Dynamic server-stat channels + role blueprinting",
    ],
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * Per-module config schemas
 *
 * Kept intentionally lean for Phase 1 — every schema yields sensible defaults
 * from `schema.parse(undefined)`. Later phases expand these in place.
 * ──────────────────────────────────────────────────────────────────────── */

export const automodConfigSchema = z
  .object({
    /** Delete messages containing any of these (case-insensitive) words. */
    blacklist: z.array(z.string()).default([]),
    /** Delete messages that contain links / invites. */
    blockLinks: z.boolean().default(false),
    /** Number of messages within the window that counts as spam. */
    spamCount: z.number().int().min(2).default(6),
    /** Spam detection window, in seconds. */
    spamWindowSeconds: z.number().int().min(1).default(5),
    /** Timeout duration (minutes) applied when automod takes action. */
    timeoutMinutes: z.number().int().min(1).default(10),
  })
  .default({});

export const moderationConfigSchema = z
  .object({
    /** Channel where mod actions are logged. */
    modLogChannelId: z.string().optional(),
    /** Master switch for the automod engine (separate from the module toggle). */
    automodEnabled: z.boolean().default(false),
    automod: automodConfigSchema,
  })
  .default({});

export type AutomodConfig = z.infer<typeof automodConfigSchema>;
export type ModerationConfig = z.infer<typeof moderationConfigSchema>;

export const auditConfigSchema = z
  .object({
    /** Private staff channel that receives audit embeds. */
    logChannelId: z.string().optional(),
    logDeletes: z.boolean().default(true),
    logEdits: z.boolean().default(true),
    logVoice: z.boolean().default(true),
    /** Skip events caused by bots. */
    ignoreBots: z.boolean().default(true),
    /** Channels to exclude from auditing. */
    ignoredChannelIds: z.array(z.string()).default([]),
  })
  .default({});

export const utilitiesConfigSchema = z
  .object({
    /** Rotate the bot's rich presence through custom text. */
    presenceEnabled: z.boolean().default(false),
    presenceMessages: z.array(z.string()).default([]),
    presenceRotateSeconds: z.number().int().min(5).default(30),
    /** Append live CPU/RAM telemetry to the presence. */
    showTelemetry: z.boolean().default(false),
    /** Default message count for the targeted archiver. */
    archiveDefaultLimit: z.number().int().min(1).max(5000).default(100),
  })
  .default({});

export const engagementConfigSchema = z
  .object({
    /** XP awarded per qualifying message. */
    xpPerMessage: z.number().int().min(0).default(15),
    /** XP awarded per minute spent in voice. */
    xpPerVoiceMinute: z.number().int().min(0).default(10),
    announceLevelUp: z.boolean().default(true),
    levelUpChannelId: z.string().optional(),
    levelUpMessage: z.string().default("GG {user}, you reached level {level}!"),
    ignoredChannelIds: z.array(z.string()).default([]),
    leaderboardSize: z.number().int().min(1).max(100).default(10),
  })
  .default({});

export type AuditConfig = z.infer<typeof auditConfigSchema>;
export type UtilitiesConfig = z.infer<typeof utilitiesConfigSchema>;
export type EngagementConfig = z.infer<typeof engagementConfigSchema>;

export const MODULE_CONFIG_SCHEMAS = {
  moderation: moderationConfigSchema,
  audit: auditConfigSchema,
  utilities: utilitiesConfigSchema,
  engagement: engagementConfigSchema,
} satisfies Record<ModuleId, z.ZodTypeAny>;

export type ModuleConfig<Id extends ModuleId> = z.infer<
  (typeof MODULE_CONFIG_SCHEMAS)[Id]
>;

export function getModuleConfigSchema(id: ModuleId): z.ZodTypeAny {
  return MODULE_CONFIG_SCHEMAS[id];
}

/* ────────────────────────────────────────────────────────────────────────
 * Config form descriptors
 *
 * These drive the dashboard's generic, in-depth config form for every module.
 * `key` is a dot-path into the module's config object.
 * ──────────────────────────────────────────────────────────────────────── */

export type ConfigFieldType =
  | "text"
  | "longtext"
  | "boolean"
  | "number"
  | "stringList"
  | "channel"
  | "channelList";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  help?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Renders a section heading above this field. */
  section?: string;
  /** Boolean dot-path that must be truthy for this field to be active. */
  dependsOn?: string;
}

export const MODULE_CONFIG_FIELDS: Record<ModuleId, ConfigField[]> = {
  moderation: [
    { key: "modLogChannelId", label: "Mod-log channel", type: "channel", section: "Logging", help: "Where moderation actions are posted." },
    { key: "automodEnabled", label: "Enable automod engine", type: "boolean", section: "Automod" },
    { key: "automod.blockLinks", label: "Block links & invites", type: "boolean", dependsOn: "automodEnabled" },
    { key: "automod.blacklist", label: "Blacklisted words", type: "stringList", dependsOn: "automodEnabled", help: "Comma or newline separated." },
    { key: "automod.spamCount", label: "Spam threshold (messages)", type: "number", min: 2, dependsOn: "automodEnabled" },
    { key: "automod.spamWindowSeconds", label: "…within this many seconds", type: "number", min: 1, dependsOn: "automodEnabled" },
    { key: "automod.timeoutMinutes", label: "Auto-timeout (minutes)", type: "number", min: 1, dependsOn: "automodEnabled" },
  ],
  audit: [
    { key: "logChannelId", label: "Staff log channel", type: "channel", section: "Logging" },
    { key: "logDeletes", label: "Log deleted messages", type: "boolean", section: "Events" },
    { key: "logEdits", label: "Log edited messages", type: "boolean" },
    { key: "logVoice", label: "Log voice join / leave / move", type: "boolean" },
    { key: "ignoreBots", label: "Ignore bot accounts", type: "boolean", section: "Filters" },
    { key: "ignoredChannelIds", label: "Ignored channels", type: "channelList" },
  ],
  utilities: [
    { key: "presenceEnabled", label: "Rotating rich presence", type: "boolean", section: "Presence" },
    { key: "presenceMessages", label: "Presence messages", type: "stringList", dependsOn: "presenceEnabled", help: "One line is shown per rotation." },
    { key: "presenceRotateSeconds", label: "Rotate every (seconds)", type: "number", min: 5, dependsOn: "presenceEnabled" },
    { key: "showTelemetry", label: "Append live CPU/RAM telemetry", type: "boolean", dependsOn: "presenceEnabled" },
    { key: "archiveDefaultLimit", label: "Archiver default message count", type: "number", min: 1, max: 5000, section: "Archiver" },
  ],
  engagement: [
    { key: "xpPerMessage", label: "XP per message", type: "number", min: 0, section: "XP rates" },
    { key: "xpPerVoiceMinute", label: "XP per voice minute", type: "number", min: 0 },
    { key: "announceLevelUp", label: "Announce level-ups", type: "boolean", section: "Level-ups" },
    { key: "levelUpChannelId", label: "Level-up channel", type: "channel", dependsOn: "announceLevelUp", help: "Leave empty to reply in the active channel." },
    { key: "levelUpMessage", label: "Level-up message", type: "longtext", dependsOn: "announceLevelUp", help: "Placeholders: {user}, {level}." },
    { key: "ignoredChannelIds", label: "Ignored channels", type: "channelList", section: "Filters" },
    { key: "leaderboardSize", label: "Leaderboard size", type: "number", min: 1, max: 100, section: "Leaderboard" },
  ],
};

/* ────────────────────────────────────────────────────────────────────────
 * API contracts
 * ──────────────────────────────────────────────────────────────────────── */

export interface ModuleState {
  id: ModuleId;
  enabled: boolean;
  config: unknown;
}

/** A module as returned to the dashboard: metadata + live state. */
export interface ModuleView extends ModuleMeta {
  enabled: boolean;
  config: unknown;
}

export interface ModulesResponse {
  modules: ModuleView[];
}

export interface ApplyRequest {
  modules: ModuleState[];
}

export interface BotStatus {
  online: boolean;
  username: string | null;
  guildCount: number;
}

export interface SystemStats {
  cpu: number; // percent 0-100
  memUsed: number; // bytes
  memTotal: number; // bytes
  uptime: number; // seconds (process)
}

export interface StatusResponse {
  bot: BotStatus;
  system: SystemStats;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
}

/* Guild metadata for config dropdowns (channels / roles). */
export interface GuildChannelInfo {
  id: string;
  name: string;
  type: "text" | "voice" | "category" | "other";
}
export interface GuildRoleInfo {
  id: string;
  name: string;
}
export interface GuildInfo {
  available: boolean;
  name: string | null;
  channels: GuildChannelInfo[];
  roles: GuildRoleInfo[];
}

/* Audit log (the Overseer). */
export type AuditEventType =
  | "message_delete"
  | "message_edit"
  | "voice_join"
  | "voice_leave"
  | "voice_move";

export interface AuditEvent {
  id: number;
  guildId: string;
  type: AuditEventType;
  userId: string;
  userTag: string;
  channelId: string | null;
  channelName: string | null;
  /** Old content (delete/edit) or origin voice channel (move/leave). */
  before: string | null;
  /** New content (edit) or destination voice channel (move/join). */
  after: string | null;
  createdAt: number;
}

export interface AuditQuery {
  type?: AuditEventType;
  userId?: string;
  limit?: number;
}

export interface AuditResponse {
  events: AuditEvent[];
}

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  message_delete: "Message Deleted",
  message_edit: "Message Edited",
  voice_join: "Voice Join",
  voice_leave: "Voice Leave",
  voice_move: "Voice Move",
};

/* ────────────────────────────────────────────────────────────────────────
 * Realtime (Socket.IO) payloads + event names
 * ──────────────────────────────────────────────────────────────────────── */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogLine {
  level: LogLevel;
  scope: string;
  msg: string;
  time: number;
}

export interface CliLine {
  kind: "out" | "err" | "cmd";
  text: string;
  time: number;
}

export const SocketEvents = {
  /** server → client: a streamed log line for the Output Stream. */
  Log: "log",
  /** server → client: a line of CLI output. */
  Cli: "cli",
  /** client → server: run a raw console command. */
  ConsoleRun: "console:run",
  /** server → client: periodic system/bot stats for live cards. */
  Stats: "stats",
  /** server → client: module config was applied to the live bot. */
  ConfigApplied: "config:applied",
  /** server → client: a new audit event (the Overseer). */
  Audit: "audit",
} as const;
