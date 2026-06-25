import { Events, GatewayIntentBits, type Message } from "discord.js";
import { MODULE_META, moderationConfigSchema } from "@velvet/shared";
import type { ModerationConfig } from "@velvet/shared";
import { getClient } from "../../client.js";
import type { VelvetModule } from "../../types.js";
import { createAutomodHandler } from "./automod.js";
import { moderationCommands } from "./commands.js";
import { setModerationConfig } from "./state.js";

let automodHandler: ((message: Message) => void) | null = null;

export const moderationModule: VelvetModule = {
  id: "moderation",
  meta: MODULE_META.moderation,
  configSchema: moderationConfigSchema,
  commands: moderationCommands,
  onEnable(ctx) {
    const config = ctx.config as ModerationConfig;
    setModerationConfig(config);

    if (config.automodEnabled) {
      const client = getClient();
      if (!client.options.intents.has(GatewayIntentBits.MessageContent)) {
        ctx.logger.warn(
          "Automod is on but the Message Content intent isn't active — restart the bot to enable " +
            "content-based rules (blacklist/links). Spam detection works regardless.",
        );
      }
      automodHandler = createAutomodHandler(ctx.logger);
      client.on(Events.MessageCreate, automodHandler);
      ctx.logger.info("Automod engine attached.");
    }
    ctx.logger.info(`Moderation commands armed (${moderationCommands.length} commands).`);
  },
  onDisable(ctx) {
    if (automodHandler) {
      getClient().off(Events.MessageCreate, automodHandler);
      automodHandler = null;
      ctx.logger.info("Automod engine detached.");
    }
    ctx.logger.info("Moderation disarmed.");
  },
};
