import { eq } from "drizzle-orm";
import {
  MODULE_IDS,
  MODULE_META,
  getModuleConfigSchema,
} from "@velvet/shared";
import type { ModuleId, ModuleState, ModuleView } from "@velvet/shared";
import { db } from "../db/client.js";
import { moduleConfig as moduleConfigTable, modules as modulesTable } from "../db/schema.js";
import { refreshCommands } from "../bot/commandManager.js";
import {
  disableModule,
  enableModule,
  getModule,
  isEnabled,
} from "../bot/moduleRegistry.js";
import { createLogger } from "../logger.js";

const log = createLogger("config");

/** Read a single module's persisted state, applying schema defaults. */
function readState(id: ModuleId): ModuleState {
  const row = db.select().from(modulesTable).where(eq(modulesTable.id, id)).get();
  const cfgRow = db
    .select()
    .from(moduleConfigTable)
    .where(eq(moduleConfigTable.moduleId, id))
    .get();
  const schema = getModuleConfigSchema(id);
  const config = schema.parse(cfgRow?.config); // undefined → defaults
  return { id, enabled: row?.enabled ?? false, config };
}

export function getModuleStates(): ModuleState[] {
  return MODULE_IDS.map(readState);
}

export function getModuleViews(): ModuleView[] {
  return getModuleStates().map((s) => ({
    ...MODULE_META[s.id],
    enabled: s.enabled,
    config: s.config,
  }));
}

function persist(id: ModuleId, enabled: boolean, config: unknown): void {
  db.insert(modulesTable)
    .values({ id, enabled })
    .onConflictDoUpdate({ target: modulesTable.id, set: { enabled } })
    .run();
  db.insert(moduleConfigTable)
    .values({ moduleId: id, config })
    .onConflictDoUpdate({ target: moduleConfigTable.moduleId, set: { config } })
    .run();
}

/**
 * The Apply pipeline: validate → persist → diff vs running state → hot-swap
 * the affected modules → re-register slash commands.
 */
export async function applyModuleStates(desired: ModuleState[]): Promise<ModuleState[]> {
  for (const d of desired) {
    const mod = getModule(d.id);
    if (!mod) {
      log.warn(`Ignoring unknown module in apply: ${d.id}`);
      continue;
    }
    const config = mod.configSchema.parse(d.config); // validate + defaults
    persist(d.id, d.enabled, config);

    const running = isEnabled(d.id);
    if (d.enabled && !running) {
      await enableModule(d.id, config);
    } else if (!d.enabled && running) {
      await disableModule(d.id, config);
    } else if (d.enabled && running) {
      // Re-enable so config changes take effect.
      await disableModule(d.id, config);
      await enableModule(d.id, config);
    }
  }

  await refreshCommands();
  log.info("Applied module configuration to the live bot.");
  return getModuleStates();
}

/** Enable every module marked enabled in the database (called on boot). */
export async function loadPersistedModules(): Promise<void> {
  for (const s of getModuleStates()) {
    if (s.enabled) await enableModule(s.id, s.config);
  }
  await refreshCommands();
}
