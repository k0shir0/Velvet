import { MODULE_META, auditConfigSchema } from "@velvet/shared";
import type { VelvetModule } from "../types.js";

export const auditModule: VelvetModule = {
  id: "audit",
  meta: MODULE_META.audit,
  configSchema: auditConfigSchema,
  commands: [],
  onEnable(ctx) {
    ctx.logger.info("Overseer audit logging armed (stub — event tracking lands in Phase 3).");
  },
  onDisable(ctx) {
    ctx.logger.info("Overseer audit logging disarmed.");
  },
};
