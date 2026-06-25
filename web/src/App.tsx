import { useEffect, useState } from "react";
import { SocketEvents } from "@velvet/shared";
import type { BotStatus, StatusResponse, SystemStats } from "@velvet/shared";
import { clearToken, getStatus, getToken } from "./lib/api";
import { getSocket } from "./lib/socket";
import { Login } from "./components/Login";
import { CommandConsole } from "./tabs/CommandConsole";
import { ModuleManager } from "./tabs/ModuleManager";
import { AuditLog } from "./tabs/AuditLog";

type Tab = "console" | "modules" | "audit";

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
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [system, setSystem] = useState<SystemStats | null>(null);

  useEffect(() => {
    let alive = true;
    getStatus()
      .then((s) => {
        if (!alive) return;
        setBot(s.bot);
        setSystem(s.system);
      })
      .catch(() => {});

    const socket = getSocket();
    const onStats = (s: StatusResponse) => {
      setBot(s.bot);
      setSystem(s.system);
    };
    socket.on(SocketEvents.Stats, onStats);
    return () => {
      alive = false;
      socket.off(SocketEvents.Stats, onStats);
    };
  }, []);

  return (
    <div className="app">
      <Header bot={bot} system={system} onLogout={onLogout} />
      <nav className="tabs">
        <button
          className={`tab ${tab === "console" ? "active" : ""}`}
          onClick={() => setTab("console")}
        >
          Command Console
        </button>
        <button
          className={`tab ${tab === "modules" ? "active" : ""}`}
          onClick={() => setTab("modules")}
        >
          Module Manager
        </button>
        <button
          className={`tab ${tab === "audit" ? "active" : ""}`}
          onClick={() => setTab("audit")}
        >
          Audit Log
        </button>
      </nav>
      <main className="content">
        {tab === "console" && <CommandConsole />}
        {tab === "modules" && <ModuleManager />}
        {tab === "audit" && <AuditLog />}
      </main>
    </div>
  );
}

function Header({
  bot,
  system,
  onLogout,
}: {
  bot: BotStatus | null;
  system: SystemStats | null;
  onLogout: () => void;
}) {
  const online = bot?.online ?? false;
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <h1>Red Velvet</h1>
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
      <div className="status-chip">
        <span className={`dot ${online ? "online" : "offline"}`} />
        {online ? (bot?.username ?? "Online") : "Offline"}
      </div>
      <button className="ghost-btn" onClick={onLogout}>
        Log out
      </button>
    </header>
  );
}

function formatGiB(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)}G`;
}
