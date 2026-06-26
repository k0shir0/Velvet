import { MODULE_META, utilitiesConfigSchema } from "@velvet/shared";
import type { UtilitiesConfig } from "@velvet/shared";
import type { VelvetModule } from "../../types.js";
import { archiveCommand } from "./archive.js";
import { startPresence, stopPresence } from "./presence.js";
import { setUtilitiesConfig } from "./state.js";

export const utilitiesModule: VelvetModule = {
  id: "utilities",
  meta: MODULE_META.utilities,
  configSchema: utilitiesConfigSchema,
  commands: [archiveCommand],
  onEnable(ctx) {
    const config = ctx.config as UtilitiesConfig;
    setUtilitiesConfig(config);
    if (config.presenceEnabled) startPresence(ctx.logger);
    ctx.logger.info("Core utilities armed (/archive ready, presence engine standing by).");
  },
  onDisable(ctx) {
    stopPresence();
    ctx.logger.info("Core utilities disarmed.");
  },
};
