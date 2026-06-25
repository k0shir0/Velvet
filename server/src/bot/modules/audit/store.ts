import { and, desc, eq } from "drizzle-orm";
import type { AuditEvent, AuditEventType, AuditQuery } from "@velvet/shared";
import { db } from "../../../db/client.js";
import { auditEvents } from "../../../db/schema.js";

/* ── In-memory message cache (for deleted/edited content) ──────────────── */

export interface CachedMessage {
  content: string;
  authorId: string;
  authorTag: string;
  authorBot: boolean;
  channelId: string;
  channelName: string;
}

const MAX_CACHE = 5000;
const messageCache = new Map<string, CachedMessage>();

export function cacheMessage(id: string, msg: CachedMessage): void {
  if (messageCache.size >= MAX_CACHE) {
    const oldest = messageCache.keys().next().value;
    if (oldest !== undefined) messageCache.delete(oldest);
  }
  messageCache.set(id, msg);
}

export function getCachedMessage(id: string): CachedMessage | undefined {
  return messageCache.get(id);
}

export function updateCachedContent(id: string, content: string): void {
  const msg = messageCache.get(id);
  if (msg) msg.content = content;
}

/* ── Persisted audit events ────────────────────────────────────────────── */

type Row = typeof auditEvents.$inferSelect;

function toEvent(row: Row): AuditEvent {
  return {
    id: row.id,
    guildId: row.guildId,
    type: row.type as AuditEventType,
    userId: row.userId,
    userTag: row.userTag,
    channelId: row.channelId,
    channelName: row.channelName,
    before: row.before,
    after: row.after,
    createdAt: row.createdAt,
  };
}

export function insertAuditEvent(event: Omit<AuditEvent, "id">): AuditEvent {
  const row = db
    .insert(auditEvents)
    .values({
      guildId: event.guildId,
      type: event.type,
      userId: event.userId,
      userTag: event.userTag,
      channelId: event.channelId,
      channelName: event.channelName,
      before: event.before,
      after: event.after,
      createdAt: event.createdAt,
    })
    .returning()
    .get();
  return toEvent(row);
}

export function queryAuditEvents(guildId: string, q: AuditQuery): AuditEvent[] {
  const conditions = [eq(auditEvents.guildId, guildId)];
  if (q.type) conditions.push(eq(auditEvents.type, q.type));
  if (q.userId) conditions.push(eq(auditEvents.userId, q.userId));
  const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);

  return db
    .select()
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit)
    .all()
    .map(toEvent);
}
