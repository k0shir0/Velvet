import { useEffect, useState } from "react";
import { SocketEvents } from "@velvet/shared";
import type { StatusResponse, SystemStats } from "@velvet/shared";
import { clearToken, getStatus, getToken } from "./lib/api";
import { getSocket } from "./lib/socket";
import { THEMES, applyTheme, getTheme, type ThemeName } from "./lib/theme";
import { Login } from "./components/Login";
import { CommandConsole } from "./tabs/CommandConsole";
import { ModuleManager } from "./tabs/ModuleManager";
import { AuditLog } from "./tabs/AuditLog";
import { Permissions } from "./tabs/Permissions";

type Tab = "console" | "modules" | "audit" | "permissions";

export function App() {
  const [authed, setAuthed] = useState(() => !!getToken());

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return (
    <Dashboard
      onLogout={() => {
        clearToken();
        setAuthed(false);
      }}
    />
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("console");
  const [system, setSystem] = useState<SystemStats | null>(null);

  useEffect(() => {
    let alive = true;
    getStatus()
      .then((s) => alive && setSystem(s.system))
      .catch(() => {});

    const socket = getSocket();
    const onStats = (s: StatusResponse) => setSystem(s.system);
    socket.on(SocketEvents.Stats, onStats);
    return () => {
      alive = false;
      socket.off(SocketEvents.Stats, onStats);
    };
  }, []);

  return (
    <div className="app">
      <Header system={system} onLogout={onLogout} />
      <nav className="tabs">
        <button className={`tab ${tab === "console" ? "active" : ""}`} onClick={() => setTab("console")}>
          Command Console
        </button>
        <button className={`tab ${tab === "modules" ? "active" : ""}`} onClick={() => setTab("modules")}>
          Module Manager
        </button>
        <button className={`tab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>
          Audit Log
        </button>
        <button
          className={`tab ${tab === "permissions" ? "active" : ""}`}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </button>
      </nav>
      <main className="content">
        {tab === "console" && <CommandConsole />}
        {tab === "modules" && <ModuleManager />}
        {tab === "audit" && <AuditLog />}
        {tab === "permissions" && <Permissions />}
      </main>
    </div>
  );
}

function Header({ system, onLogout }: { system: SystemStats | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>(getTheme());

  const setTheme = (t: ThemeName) => {
    applyTheme(t);
    setThemeState(t);
  };

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <h1>Velvet</h1>
          <span>Control Panel</span>
        </div>
      </div>
      <div className="header-spacer" />
      {system && (
        <div className="metrics">
          <div>
            CPU <b>{system.cpu}%</b>
          </div>
          <div>
            RAM <b>{formatGiB(system.memUsed)}/{formatGiB(system.memTotal)}</b>
          </div>
        </div>
      )}
      <div className="settings-wrap">
        <button
          className={`icon-btn ${open ? "active" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Settings"
        >
          ⚙
        </button>
        {open && (
          <>
            <div className="menu-backdrop" onClick={() => setOpen(false)} />
            <div className="settings-menu">
              <div className="menu-label">Theme</div>
              <div className="theme-row">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-btn ${theme === t.id ? "active" : ""}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span className={`theme-swatch ${t.id}`} />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="menu-divider" />
              <button className="menu-item" onClick={onLogout}>
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function formatGiB(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)}G`;
}
