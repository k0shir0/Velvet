import { Events, MessageFlags } from "discord.js";
import { createLogger } from "../logger.js";
import { getClient } from "./client.js";
import { getEnabledModules } from "./moduleRegistry.js";

const log = createLogger("interactions");

let attached = false;

/**
 * Attach the global slash-command router. Commands are resolved dynamically
 * from whichever modules are currently enabled, so this only needs to be
 * attached once at startup.
 */
export function attachInteractionRouter(): void {
  if (attached) return;
  attached = true;

  getClient().on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = getEnabledModules()
      .flatMap((m) => m.commands ?? [])
      .find((c) => c.name === interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      log.error(`Command /${interaction.commandName} failed: ${(err as Error).message}`);
      const payload = {
        content: "⚠️ Something went wrong running that command.",
        flags: MessageFlags.Ephemeral,
      } as const;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}
