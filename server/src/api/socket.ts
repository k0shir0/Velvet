import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { SocketEvents } from "@velvet/shared";
import type { LogLine } from "@velvet/shared";
import { logBus } from "../logger.js";
import { runConsoleCommand } from "../core/console.js";
import { getStatus } from "../core/status.js";
import { isValidToken } from "./auth.js";

let io: Server | null = null;

export function getIo(): Server | null {
  return io;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: true } });

  // Authenticate the handshake with the dashboard session token.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!isValidToken(token)) {
      next(new Error("Unauthorized"));
      return;
    }
    next();
  });

  io.on("connection", (socket) => {
    socket.on(SocketEvents.ConsoleRun, async (command: unknown) => {
      const lines = await runConsoleCommand(String(command ?? ""));
      for (const line of lines) socket.emit(SocketEvents.Cli, line);
    });
  });

  // Stream every log line to the Output Stream.
  logBus.on("line", (line: LogLine) => {
    io?.emit(SocketEvents.Log, line);
  });

  // Broadcast live stats to the dashboard every 2s while someone is watching.
  setInterval(() => {
    if (!io || io.engine.clientsCount === 0) return;
    getStatus()
      .then((stats) => io?.emit(SocketEvents.Stats, stats))
      .catch(() => {
        /* ignore transient telemetry errors */
      });
  }, 2000);

  return io;
}
