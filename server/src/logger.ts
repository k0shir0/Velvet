import { EventEmitter } from "node:events";
import pino from "pino";
import type { LogLevel, LogLine } from "@velvet/shared";
import { env } from "./env.js";

/**
 * Every log line is written to pino (pretty console in dev) *and* emitted on
 * this bus, which the Socket.IO layer forwards to the dashboard Output Stream.
 */
export const logBus = new EventEmitter();

const pinoLogger = pino({
  level: "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
});

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export function createLogger(scope: string): Logger {
  const child = pinoLogger.child({ scope });
  const make = (level: LogLevel) => (msg: string) => {
    child[level]({ scope }, msg);
    const line: LogLine = { level, scope, msg, time: Date.now() };
    logBus.emit("line", line);
  };
  return {
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
  };
}

export const logger = createLogger("velvet");
