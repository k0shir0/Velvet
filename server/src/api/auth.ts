import { randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../env.js";

// In-memory set of issued session tokens. Fine for a single locally-hosted
// instance; tokens are cleared on restart.
const tokens = new Set<string>();

export function issueToken(password: string): string | null {
  if (password !== env.DASHBOARD_PASSWORD) return null;
  const token = randomBytes(24).toString("hex");
  tokens.add(token);
  return token;
}

export function isValidToken(token: string | undefined): boolean {
  return token !== undefined && tokens.has(token);
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!isValidToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
