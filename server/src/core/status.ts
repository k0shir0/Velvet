import si from "systeminformation";
import type { StatusResponse } from "@velvet/shared";
import { client } from "../bot/client.js";

/** Live bot + host telemetry for the dashboard status cards. */
export async function getStatus(): Promise<StatusResponse> {
  const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
  return {
    bot: {
      online: client.isReady(),
      username: client.user?.tag ?? null,
      guildCount: client.guilds.cache.size,
    },
    system: {
      cpu: Math.round(cpu.currentLoad),
      memUsed: mem.active,
      memTotal: mem.total,
      uptime: Math.round(process.uptime()),
    },
  };
}
