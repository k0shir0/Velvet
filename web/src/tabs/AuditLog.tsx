import { useEffect, useState } from "react";
import { AUDIT_EVENT_LABELS, SocketEvents } from "@velvet/shared";
import type { AuditEvent, AuditEventType } from "@velvet/shared";
import { getAudit } from "../lib/api";
import { getSocket } from "../lib/socket";

const TYPE_OPTIONS: { value: "" | AuditEventType; label: string }[] = [
  { value: "", label: "All events" },
  { value: "message_delete", label: AUDIT_EVENT_LABELS.message_delete },
  { value: "message_edit", label: AUDIT_EVENT_LABELS.message_edit },
  { value: "voice_join", label: AUDIT_EVENT_LABELS.voice_join },
  { value: "voice_leave", label: AUDIT_EVENT_LABELS.voice_leave },
  { value: "voice_move", label: AUDIT_EVENT_LABELS.voice_move },
];

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [type, setType] = useState<"" | AuditEventType>("");
  const [user, setUser] = useState("");
  const [loading, setLoading] = useState(false);

  function refresh() {
    setLoading(true);
    getAudit({ type: type || undefined, userId: user.trim() || undefined, limit: 200 })
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }

  // Re-query whenever the filter changes.
  useEffect(refresh, [type, user]);

  // Live-prepend new events that match the active filter.
  useEffect(() => {
    const socket = getSocket();
    const onAudit = (event: AuditEvent) => {
      if (type && event.type !== type) return;
      if (user.trim() && event.userId !== user.trim()) return;
      setEvents((prev) => [event, ...prev].slice(0, 200));
    };
    socket.on(SocketEvents.Audit, onAudit);
    return () => {
      socket.off(SocketEvents.Audit, onAudit);
    };
  }, [type, user]);

  return (
    <div className="audit">
      <div className="audit-filters">
        <select value={type} onChange={(e) => setType(e.target.value as "" | AuditEventType)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter by user ID…"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <button className="ghost-btn" onClick={refresh}>
          {loading ? "…" : "Refresh"}
        </button>
        <span className="spacer" />
        <span className="audit-count">{events.length} events</span>
      </div>

      <div className="audit-table">
        {events.length === 0 ? (
          <div className="empty-hint">
            No audit events yet. Enable the <b>Advanced Audit Logging</b> module and configure a
            staff log channel.
          </div>
        ) : (
          events.map((e) => <AuditRow key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <div className="audit-row">
      <span className="audit-time">{new Date(event.createdAt).toLocaleString()}</span>
      <span className={`audit-badge ${event.type}`}>{AUDIT_EVENT_LABELS[event.type]}</span>
      <span className="audit-user">{event.userTag}</span>
      <span className="audit-details">
        <Details event={event} />
      </span>
    </div>
  );
}

function Details({ event }: { event: AuditEvent }) {
  if (event.type === "message_delete") {
    return (
      <>
        {event.channelName && <span className="audit-chan">#{event.channelName}</span>}
        <span className="audit-deleted">{event.before || "[no content]"}</span>
      </>
    );
  }
  if (event.type === "message_edit") {
    return (
      <>
        {event.channelName && <span className="audit-chan">#{event.channelName}</span>}
        <span className="audit-before">{event.before || "—"}</span>
        <span className="audit-arrow">→</span>
        <span className="audit-after">{event.after || "—"}</span>
      </>
    );
  }
  if (event.type === "voice_join") return <span>Joined {event.after}</span>;
  if (event.type === "voice_leave") return <span>Left {event.before}</span>;
  return (
    <span>
      {event.before} <span className="audit-arrow">→</span> {event.after}
    </span>
  );
}
