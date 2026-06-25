import { createServer, type Server as HttpServer } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { LoginRequest } from "@velvet/shared";
import { issueToken, requireAuth } from "./auth.js";
import { auditRouter } from "./routes/audit.js";
import { consoleRouter } from "./routes/console.js";
import { guildRouter } from "./routes/guild.js";
import { modulesRouter } from "./routes/modules.js";
import { statusRouter } from "./routes/status.js";

export function createHttpServer(): HttpServer {
  const app = express();
  app.use(express.json());

  app.post("/api/auth/login", (req, res) => {
    const { password } = (req.body ?? {}) as Partial<LoginRequest>;
    const token = issueToken(password ?? "");
    if (!token) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    res.json({ token });
  });

  app.use("/api/modules", requireAuth, modulesRouter);
  app.use("/api/console", requireAuth, consoleRouter);
  app.use("/api/status", requireAuth, statusRouter);
  app.use("/api/guild", requireAuth, guildRouter);
  app.use("/api/audit", requireAuth, auditRouter);

  // In production, serve the built dashboard (in dev, Vite serves it).
  const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../../web/dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get("*", (_req, res) => {
      res.sendFile(join(webDist, "index.html"));
    });
  }

  return createServer(app);
}
