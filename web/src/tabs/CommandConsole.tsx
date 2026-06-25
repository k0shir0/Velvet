import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SocketEvents } from "@velvet/shared";
import type { CliLine, LogLine } from "@velvet/shared";
import { getSocket } from "../lib/socket";

type Entry =
  | { type: "log"; data: LogLine }
  | { type: "cli"; data: CliLine };

const MAX_LINES = 500;

export function CommandConsole() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    const onLog = (data: LogLine) =>
      setEntries((e) => [...e, { type: "log" as const, data }].slice(-MAX_LINES));
    const onCli = (data: CliLine) =>
      setEntries((e) => [...e, { type: "cli" as const, data }].slice(-MAX_LINES));
    socket.on(SocketEvents.Log, onLog);
    socket.on(SocketEvents.Cli, onCli);
    return () => {
      socket.off(SocketEvents.Log, onLog);
      socket.off(SocketEvents.Cli, onCli);
    };
  }, []);

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    getSocket().emit(SocketEvents.ConsoleRun, cmd);
    setInput("");
  }

  return (
    <div className="terminal">
      <div className="terminal-bar">
        <span className="lamp r" />
        <span className="lamp y" />
        <span className="lamp g" />
        <span style={{ marginLeft: 8 }}>velvet · console</span>
      </div>
      <div className="terminal-out" ref={outRef}>
        {entries.length === 0 && (
          <div className="empty-hint">
            Live output stream. Type <b>help</b> below to list commands.
          </div>
        )}
        {entries.map((entry, i) => (
          <ConsoleLine key={i} entry={entry} />
        ))}
      </div>
      <form className="terminal-input" onSubmit={submit}>
        <span className="prompt">❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Run a command…  (try: help)"
          spellCheck={false}
          autoFocus
        />
      </form>
    </div>
  );
}

function ConsoleLine({ entry }: { entry: Entry }) {
  const time = new Date(entry.data.time).toLocaleTimeString();
  if (entry.type === "log") {
    const { level, scope, msg } = entry.data;
    return (
      <div className={`line ${level}`}>
        <span className="ts">{time}</span>
        <span className="scope">[{scope}]</span>
        {msg}
      </div>
    );
  }
  const { kind, text } = entry.data;
  return (
    <div className={`line ${kind}`}>
      <span className="ts">{time}</span>
      {text}
    </div>
  );
}
