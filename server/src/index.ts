import { Events } from "discord.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { client } from "./bot/client.js";
import { registerAllModules } from "./bot/modules/index.js";
import { ensureSchema } from "./db/client.js";
import { loadPersistedModules } from "./core/config.js";
import { createHttpServer } from "./api/http.js";
import { initSocket } from "./api/socket.js";

async function main(): Promise<void> {
  ensureSchema();
  registerAllModules();

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
      logger.error(`Discord login failed: ${(err as Error).message}`);
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
