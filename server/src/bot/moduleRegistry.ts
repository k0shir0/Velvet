import type { ModuleId } from "@velvet/shared";
import { createLogger } from "../logger.js";
import { client } from "./client.js";
import type { ModuleContext, VelvetModule } from "./types.js";

const log = createLogger("modules");

const registry = new Map<ModuleId, VelvetModule>();
const enabled = new Set<ModuleId>();

export function register(mod: VelvetModule): void {
  registry.set(mod.id, mod);
}

export function getModule(id: ModuleId): VelvetModule | undefined {
  return registry.get(id);
}

export function getAllModules(): VelvetModule[] {
  return [...registry.values()];
}

export function isEnabled(id: ModuleId): boolean {
  return enabled.has(id);
}

export function getEnabledModules(): VelvetModule[] {
  return [...enabled]
    .map((id) => registry.get(id))
    .filter((m): m is VelvetModule => m !== undefined);
}

export async function enableModule(id: ModuleId, config: unknown): Promise<void> {
  const mod = registry.get(id);
  if (!mod || enabled.has(id)) return;
  const ctx: ModuleContext = { client, config, logger: createLogger(`mod:${id}`) };
  await mod.onEnable(ctx);
  enabled.add(id);
  log.info(`Enabled module: ${id}`);
}

export async function disableModule(id: ModuleId, config: unknown): Promise<void> {
  const mod = registry.get(id);
  if (!mod || !enabled.has(id)) return;
  const ctx: ModuleContext = { client, config, logger: createLogger(`mod:${id}`) };
  await mod.onDisable(ctx);
  enabled.delete(id);
  log.info(`Disabled module: ${id}`);
}
