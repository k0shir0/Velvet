import { engagementConfigSchema } from "@velvet/shared";
import type { EngagementConfig } from "@velvet/shared";

let current: EngagementConfig = engagementConfigSchema.parse(undefined);

export function setEngagementConfig(config: EngagementConfig): void {
  current = config;
}

export function getEngagementConfig(): EngagementConfig {
  return current;
}
