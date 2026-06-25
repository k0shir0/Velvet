import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// Load .env from the server cwd and the repo root (root wins for shared keys).
loadDotenv({
  path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")],
});

/** Treat empty strings as "not set". */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const schema = z.object({
  TOKEN: optionalString,
  CLIENT_ID: optionalString,
  GUILD_ID: optionalString,
  DASHBOARD_PORT: z.coerce.number().int().positive().default(4317),
  DASHBOARD_PASSWORD: z.string().min(1).default("velvet"),
  DATABASE_PATH: z.string().min(1).default("./data/velvet.sqlite"),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "✖ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
