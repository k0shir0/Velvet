import { ActivityType } from "discord.js";
import si from "systeminformation";
import type { Logger } from "../../../logger.js";
import { getClient } from "../../client.js";
import { getUtilitiesConfig } from "./state.js";

let timer: ReturnType<typeof setInterval> | null = null;
let index = 0;

async function tick(): Promise<void> {
  const cfg = getUtilitiesConfig();
  const client = getClient();
  if (!client.isReady() || !cfg.presenceEnabled) return;

  const messages = cfg.presenceMessages.length > 0 ? cfg.presenceMessages : ["Velvet"];
  let text = messages[index % messages.length] ?? "Velvet";
  index += 1;

  if (cfg.showTelemetry) {
    try {
      const [load, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      const ram = Math.round((mem.active / mem.total) * 100);
      text = `${text} · CPU ${Math.round(load.currentLoad)}% RAM ${ram}%`;
    } catch {
      /* ignore transient telemetry errors */
    }
  }

  client.user?.setActivity(text.slice(0, 128), { type: ActivityType.Watching });
}

/** Start (or restart) the rotating rich-presence timer. */
export function startPresence(logger: Logger): void {
  stopPresence();
  const seconds = Math.max(5, getUtilitiesConfig().presenceRotateSeconds);
  void tick();
  timer = setInterval(() => void tick(), seconds * 1000);
  logger.info(`Rotating presence started (every ${seconds}s).`);
}

export function stopPresence(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  index = 0;
  const client = getClient();
  if (client.isReady()) client.user?.setActivity();
}
