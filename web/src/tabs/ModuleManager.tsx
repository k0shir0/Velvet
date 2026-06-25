import { useEffect, useState } from "react";
import { SocketEvents } from "@velvet/shared";
import type { GuildInfo, ModuleState, ModuleView } from "@velvet/shared";
import { applyModules, getGuild, getModules } from "../lib/api";
import { getSocket } from "../lib/socket";
import { Toggle } from "../components/Toggle";
import { ConfigForm } from "../components/ConfigForm";

interface Staged {
  enabled: boolean;
  config: unknown;
}

export function ModuleManager() {
  const [baseline, setBaseline] = useState<ModuleView[]>([]);
  const [staged, setStaged] = useState<Record<string, Staged>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(views: ModuleView[]) {
    setBaseline(views);
    setStaged(Object.fromEntries(views.map((v) => [v.id, { enabled: v.enabled, config: v.config }])));
  }

  useEffect(() => {
    getModules()
      .then((r) => load(r.modules))
      .catch((e) => setError((e as Error).message));
    getGuild()
      .then(setGuild)
      .catch(() => setGuild(null));

    const socket = getSocket();
    const onApplied = (payload: { modules: ModuleView[] }) => load(payload.modules);
    socket.on(SocketEvents.ConfigApplied, onApplied);
    return () => {
      socket.off(SocketEvents.ConfigApplied, onApplied);
    };
  }, []);

  function isDirty(v: ModuleView): boolean {
    const s = staged[v.id];
    if (!s) return false;
    return s.enabled !== v.enabled || JSON.stringify(s.config) !== JSON.stringify(v.config);
  }
  const pending = baseline.filter(isDirty).length;

  function setEnabled(id: string, enabled: boolean) {
    setStaged((s) => ({ ...s, [id]: { ...(s[id] ?? { config: {} }), enabled } }));
  }
  function setConfig(id: string, config: unknown) {
    setStaged((s) => ({ ...s, [id]: { ...(s[id] ?? { enabled: false }), config } }));
  }

  async function push() {
    setApplying(true);
    setError(null);
    try {
      const desired: ModuleState[] = baseline.map((v) => ({
        id: v.id,
        enabled: staged[v.id]?.enabled ?? v.enabled,
        config: staged[v.id]?.config ?? v.config,
      }));
      const r = await applyModules(desired);
      load(r.modules);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <div className="module-grid">
        {baseline.map((mod) => {
          const s = staged[mod.id];
          const on = s?.enabled ?? mod.enabled;
          const open = expanded[mod.id] ?? false;
          const dirty = isDirty(mod);
          return (
            <div key={mod.id} className={`card ${on ? "staged-on" : ""} ${dirty ? "dirty" : ""}`}>
              <div className="card-head">
                <h3>{mod.name}</h3>
                <Toggle checked={on} onChange={(v) => setEnabled(mod.id, v)} />
              </div>
              <p className="card-desc">{mod.description}</p>
              {!open && (
                <ul className="feature-list">
                  {mod.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}

              <button
                className="configure-btn"
                onClick={() => setExpanded((e) => ({ ...e, [mod.id]: !open }))}
              >
                {open ? "▾ Hide configuration" : "▸ Configure"}
              </button>
              {open && (
                <ConfigForm
                  moduleId={mod.id}
                  value={s?.config ?? mod.config}
                  guild={guild}
                  onChange={(cfg) => setConfig(mod.id, cfg)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="apply-bar">
        <span className="pending">
          {pending === 0 ? (
            "All changes deployed"
          ) : (
            <>
              <b>{pending}</b> pending change{pending > 1 ? "s" : ""}
            </>
          )}
        </span>
        {error && (
          <span className="pending" style={{ color: "var(--bad)" }}>
            {error}
          </span>
        )}
        <span className="spacer" />
        <button className="ghost-btn" onClick={() => load(baseline)} disabled={pending === 0 || applying}>
          Discard
        </button>
        <button className="btn btn-primary" onClick={push} disabled={pending === 0 || applying}>
          {applying ? "Pushing…" : "Push Changes"}
        </button>
      </div>
    </div>
  );
}
