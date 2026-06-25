import type { CliLine } from "@velvet/shared";
import { getClient } from "../bot/client.js";
import { getAllModules, isEnabled } from "../bot/moduleRegistry.js";
import { loadPersistedModules } from "./config.js";

type Handler = (args: string[]) => string[] | Promise<string[]>;

interface ConsoleCommand {
  desc: string;
  run: Handler;
}

const commands: Record<string, ConsoleCommand> = {
  help: {
    desc: "List available commands",
    run: () =>
      Object.entries(commands).map(([name, c]) => `${name.padEnd(10)} ${c.desc}`),
  },
  status: {
    desc: "Show the bot connection status",
    run: () => {
      const client = getClient();
      return [
        client.isReady() ? `Online as ${client.user?.tag}` : "Offline (no bot login)",
        `Guilds: ${client.guilds.cache.size}`,
      ];
    },
  },
  modules: {
    desc: "List modules and whether they are enabled",
    run: () =>
      getAllModules().map(
        (m) => `${isEnabled(m.id) ? "● on " : "○ off"}  ${m.id.padEnd(12)} ${m.meta.name}`,
      ),
  },
  reload: {
    desc: "Re-apply persisted module configuration",
    run: async () => {
      await loadPersistedModules();
      return ["Reloaded persisted module configuration."];
    },
  },
  echo: {
    desc: "Echo the arguments back",
    run: (args) => [args.join(" ")],
  },
};

/** Parse and run a raw console command, returning the lines to display. */
export async function runConsoleCommand(input: string): Promise<CliLine[]> {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const [name, ...args] = trimmed.split(/\s+/);
  const lines: CliLine[] = [{ kind: "cmd", text: `> ${trimmed}`, time: Date.now() }];

  const cmd = name ? commands[name] : undefined;
  if (!cmd) {
    lines.push({
      kind: "err",
      text: `Unknown command: ${name ?? ""}. Try 'help'.`,
      time: Date.now(),
    });
    return lines;
  }

  try {
    const out = await cmd.run(args);
    for (const text of out) lines.push({ kind: "out", text, time: Date.now() });
  } catch (err) {
    lines.push({ kind: "err", text: `Error: ${(err as Error).message}`, time: Date.now() });
  }
  return lines;
}
