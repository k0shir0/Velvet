import { auditConfigSchema } from "@velvet/shared";
import type { AuditConfig } from "@velvet/shared";

let current: AuditConfig = auditConfigSchema.parse(undefined);

export function setAuditConfig(config: AuditConfig): void {
  current = config;
}

export function getAuditConfig(): AuditConfig {
  return current;
}
