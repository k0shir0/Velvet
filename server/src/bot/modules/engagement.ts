import { MODULE_META, engagementConfigSchema } from "@velvet/shared";
import type { VelvetModule } from "../types.js";

export const engagementModule: VelvetModule = {
  id: "engagement",
  meta: MODULE_META.engagement,
  configSchema: engagementConfigSchema,
  commands: [],
  onEnable(ctx) {
    ctx.logger.info("Server engagement armed (stub — XP & reaction roles land in Phase 5).");
  },
  onDisable(ctx) {
    ctx.logger.info("Server engagement disarmed.");
  },
};
