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

export const moderationConfigSchema = z
  .object({
    /** Channel where mod actions are logged. */
    modLogChannelId: z.string().optional(),
  })
  .default({});

export const auditConfigSchema = z
  .object({
    /** Private staff channel that receives audit embeds. */
    logChannelId: z.string().optional(),
  })
  .default({});

export const utilitiesConfigSchema = z
  .object({
    /** Rotating rich-presence text chunks. */
    presenceMessages: z.array(z.string()).default([]),
  })
  .default({});

export const engagementConfigSchema = z
  .object({
    /** XP awarded per qualifying message. */
    xpPerMessage: z.number().int().min(0).default(15),
  })
  .default({});

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
} as const;
