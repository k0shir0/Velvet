import { Router } from "express";
import { SocketEvents } from "@velvet/shared";
import { runConsoleCommand } from "../../core/console.js";
import { getIo } from "../socket.js";

export const consoleRouter: Router = Router();

consoleRouter.post("/run", async (req, res) => {
  const { command } = (req.body ?? {}) as { command?: unknown };
  if (typeof command !== "string") {
    res.status(400).json({ error: "Missing 'command' string" });
    return;
  }
  const lines = await runConsoleCommand(command);
  const io = getIo();
  if (io) for (const line of lines) io.emit(SocketEvents.Cli, line);
  res.json({ lines });
});
