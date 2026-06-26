import { useEffect, useState } from "react";
import { SocketEvents } from "@velvet/shared";
import type { GuildInfo, ModuleId, ModuleState, ModuleView } from "@velvet/shared";
import { applyModules, getGuild, getModules } from "../lib/api";
import { getSocket } from "../lib/socket";
import { Toggle } from "../components/Toggle";
import { ConfigForm } from "../components/ConfigForm";
import { EngagementExtras } from "../components/EngagementExtras";

interface Staged {
  enabled: boolean;
  config: unknown;
}

export function ModuleManager() {
  const [baseline, setBaseline] = useState<ModuleView[]>([]);
  const [staged, setStaged] = useState<Record<string, Staged>>({});
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [view, setView] = useState<"grid" | ModuleId>("grid");
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

  const active = view !== "grid" ? baseline.find((m) => m.id === view) : undefined;

  return (
    <div>
      {view === "grid" ? (
        <div className="module-grid">
          {baseline.map((mod) => {
            const on = staged[mod.id]?.enabled ?? mod.enabled;
            return (
              <div
                key={mod.id}
                className={`card module-card ${on ? "staged-on" : ""} ${isDirty(mod) ? "dirty" : ""}`}
                onClick={() => setView(mod.id)}
              >
                <div className="card-head">
                  <h3>{mod.name}</h3>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={on} onChange={(v) => setEnabled(mod.id, v)} />
                  </div>
                </div>
                <p className="card-desc">{mod.description}</p>
                <ul className="feature-list">
                  {mod.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="card-cta">Open &amp; configure →</div>
              </div>
            );
          })}
        </div>
      ) : (
        active && (
          <div className="module-detail">
            <button className="back-btn" onClick={() => setView("grid")}>
              ← All modules
            </button>
            <nav className="mod-tabs">
              {baseline.map((m) => (
                <button
                  key={m.id}
                  className={`mod-tab ${m.id === view ? "active" : ""}`}
                  onClick={() => setView(m.id)}
                >
                  <span className={`mod-dot ${(staged[m.id]?.enabled ?? m.enabled) ? "on" : ""}`} />
                  {m.name}
                </button>
              ))}
            </nav>

            <div className="detail-body">
              <div className="detail-head">
                <div>
                  <h2>{active.name}</h2>
                  <p>{active.description}</p>
                </div>
                <label className="enable-switch">
                  <span>{(staged[active.id]?.enabled ?? active.enabled) ? "Enabled" : "Disabled"}</span>
                  <Toggle
                    checked={staged[active.id]?.enabled ?? active.enabled}
                    onChange={(v) => setEnabled(active.id, v)}
                  />
                </label>
              </div>

              <ConfigForm
                moduleId={active.id}
                value={staged[active.id]?.config ?? active.config}
                guild={guild}
                onChange={(cfg) => setConfig(active.id, cfg)}
              />

              {active.id === "engagement" && <EngagementExtras guild={guild} />}
            </div>
          </div>
        )
      )}

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
