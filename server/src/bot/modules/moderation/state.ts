import { moderationConfigSchema } from "@velvet/shared";
import type { ModerationConfig } from "@velvet/shared";

// The live moderation config, kept in sync by the module's onEnable hook so
// command handlers and the automod engine can read it without a DB round-trip.
let current: ModerationConfig = moderationConfigSchema.parse(undefined);

export function setModerationConfig(config: ModerationConfig): void {
  current = config;
}

export function getModerationConfig(): ModerationConfig {
  return current;
}
