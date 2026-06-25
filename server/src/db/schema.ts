import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Enabled/disabled state for each module. */
export const modules = sqliteTable("modules", {
  id: text("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
});

/** JSON-encoded config blob for each module. */
export const moduleConfig = sqliteTable("module_config", {
  moduleId: text("module_id").primaryKey(),
  config: text("config", { mode: "json" }).notNull(),
});
