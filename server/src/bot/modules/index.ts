import { register } from "../moduleRegistry.js";
import { auditModule } from "./audit/index.js";
import { engagementModule } from "./engagement/index.js";
import { moderationModule } from "./moderation/index.js";
import { utilitiesModule } from "./utilities/index.js";

/** Register every known module with the registry (all start disabled). */
export function registerAllModules(): void {
  register(moderationModule);
  register(auditModule);
  register(utilitiesModule);
  register(engagementModule);
}
