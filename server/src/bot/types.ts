import type { Client, SlashCommandBuilder } from "discord.js";
import type { ModuleId, ModuleMeta } from "@velvet/shared";
import type { z } from "zod";
import type { Logger } from "../logger.js";

/** Runtime context handed to a module's lifecycle hooks. */
export interface ModuleContext {
  client: Client;
  /** The validated, defaults-applied config for this module. */
  config: unknown;
  logger: Logger;
}

/**
 * The contract every feature module implements. A module is inert until
 * `onEnable` is called by the Apply pipeline, and tears itself down in
 * `onDisable` (detaching listeners, clearing timers, etc.).
 */
export interface VelvetModule {
  id: ModuleId;
  meta: ModuleMeta;
  configSchema: z.ZodTypeAny;
  /** Slash commands contributed while enabled (empty for Phase 1 stubs). */
  commands?: SlashCommandBuilder[];
  onEnable(ctx: ModuleContext): void | Promise<void>;
  onDisable(ctx: ModuleContext): void | Promise<void>;
}
