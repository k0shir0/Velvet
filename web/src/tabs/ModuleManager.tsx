import { useEffect, useState } from "react";
import { SocketEvents } from "@velvet/shared";
import type { ModuleState, ModuleView } from "@velvet/shared";
import { applyModules, getModules } from "../lib/api";
import { getSocket } from "../lib/socket";
import { Toggle } from "../components/Toggle";

export function ModuleManager() {
  const [baseline, setBaseline] = useState<ModuleView[]>([]);
  const [staged, setStaged] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(views: ModuleView[]) {
    setBaseline(views);
    setStaged(Object.fromEntries(views.map((v) => [v.id, v.enabled])));
  }

  useEffect(() => {
    getModules()
      .then((r) => load(r.modules))
      .catch((e) => setError((e as Error).message));

    const socket = getSocket();
    const onApplied = (payload: { modules: ModuleView[] }) => load(payload.modules);
    socket.on(SocketEvents.ConfigApplied, onApplied);
    return () => {
      socket.off(SocketEvents.ConfigApplied, onApplied);
    };
  }, []);

  const pending = baseline.filter((v) => (staged[v.id] ?? v.enabled) !== v.enabled).length;

  async function push() {
    setApplying(true);
    setError(null);
    try {
      const desired: ModuleState[] = baseline.map((v) => ({
        id: v.id,
        enabled: staged[v.id] ?? v.enabled,
        config: v.config,
      }));
      const r = await applyModules(desired);
      load(r.modules);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  function discard() {
    setStaged(Object.fromEntries(baseline.map((v) => [v.id, v.enabled])));
  }

  return (
    <div>
      <div className="module-grid">
        {baseline.map((mod) => {
          const on = staged[mod.id] ?? mod.enabled;
          return (
            <div key={mod.id} className={`card ${on ? "staged-on" : ""}`}>
              <div className="card-head">
                <h3>{mod.name}</h3>
                <Toggle
                  checked={on}
                  onChange={(v) => setStaged((s) => ({ ...s, [mod.id]: v }))}
                />
              </div>
              <p className="card-desc">{mod.description}</p>
              <ul className="feature-list">
                {mod.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
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
        <button className="ghost-btn" onClick={discard} disabled={pending === 0 || applying}>
          Discard
        </button>
        <button className="btn btn-primary" onClick={push} disabled={pending === 0 || applying}>
          {applying ? "Pushing…" : "Push Changes"}
        </button>
      </div>
    </div>
  );
}
