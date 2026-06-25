import { MODULE_META, moderationConfigSchema } from "@velvet/shared";
import type { VelvetModule } from "../types.js";

export const moderationModule: VelvetModule = {
  id: "moderation",
  meta: MODULE_META.moderation,
  configSchema: moderationConfigSchema,
  commands: [],
  onEnable(ctx) {
    ctx.logger.info("Moderation core armed (stub — commands & automod land in Phase 2).");
  },
  onDisable(ctx) {
    ctx.logger.info("Moderation core disarmed.");
  },
};
