import { MODULE_META, utilitiesConfigSchema } from "@velvet/shared";
import type { VelvetModule } from "../types.js";

export const utilitiesModule: VelvetModule = {
  id: "utilities",
  meta: MODULE_META.utilities,
  configSchema: utilitiesConfigSchema,
  commands: [],
  onEnable(ctx) {
    ctx.logger.info("Core utilities armed (stub — archiver & presence land in Phase 4).");
  },
  onDisable(ctx) {
    ctx.logger.info("Core utilities disarmed.");
  },
};
