import { defineConfig } from "drizzle-kit";

// Used by `npm run db:generate` for future SQL migrations. The running server
// currently bootstraps its schema idempotently via `ensureSchema()`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/velvet.sqlite",
  },
});
