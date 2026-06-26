import { utilitiesConfigSchema } from "@velvet/shared";
import type { UtilitiesConfig } from "@velvet/shared";

let current: UtilitiesConfig = utilitiesConfigSchema.parse(undefined);

export function setUtilitiesConfig(config: UtilitiesConfig): void {
  current = config;
}

export function getUtilitiesConfig(): UtilitiesConfig {
  return current;
}
