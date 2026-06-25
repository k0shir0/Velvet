import { Events } from "discord.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { initClient } from "./bot/client.js";
import { computeIntents } from "./bot/intents.js";
import { attachInteractionRouter } from "./bot/interactions.js";
import { registerAllModules } from "./bot/modules/index.js";
import { ensureSchema } from "./db/client.js";
import { getModuleStates, loadPersistedModules } from "./core/config.js";
import { createHttpServer } from "./api/http.js";
import { initSocket } from "./api/socket.js";

async function main(): Promise<void> {
  ensureSchema();
  registerAllModules();

  // Compute gateway intents from the persisted module state so privileged
  // intents are only requested when a feature actually needs them.
  const intents = computeIntents(getModuleStates());
  const client = initClient(intents);
  logger.info(`Gateway intents: ${intents.length} requested.`);

  attachInteractionRouter();

  // Bring previously-enabled modules online once the bot is ready.
  client.once(Events.ClientReady, () => {
    logger.info(`Logged in as ${client.user?.tag}`);
    void loadPersistedModules();
  });

  // The control panel runs whether or not the bot logs in.
  const httpServer = createHttpServer();
  initSocket(httpServer);
  httpServer.listen(env.DASHBOARD_PORT, () => {
    logger.info(`Control panel API on http://localhost:${env.DASHBOARD_PORT}`);
  });

  if (env.TOKEN) {
    try {
      await client.login(env.TOKEN);
    } catch (err) {
      const message = (err as Error).message;
      if (/disallowed intents/i.test(message)) {
        logger.error(
          "Discord login failed: a privileged intent is not enabled. Enable 'Message Content Intent' " +
            "in the Developer Portal (Bot → Privileged Gateway Intents), then restart. Automod needs it.",
        );
      } else {
        logger.error(`Discord login failed: ${message}`);
      }
    }
  } else {
    logger.warn("No TOKEN set — running the dashboard in offline mode (bot not logged in).");
    await loadPersistedModules();
  }
}

main().catch((err) => {
  logger.error(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
