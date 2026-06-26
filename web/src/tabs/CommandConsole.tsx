import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SocketEvents } from "@velvet/shared";
import type { CliLine } from "@velvet/shared";
import { getSocket } from "../lib/socket";

const MAX_LINES = 500;

export function CommandConsole() {
  const [lines, setLines] = useState<CliLine[]>([]);
  const [input, setInput] = useState("");
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    const onCli = (line: CliLine) => setLines((prev) => [...prev, line].slice(-MAX_LINES));
    socket.on(SocketEvents.Cli, onCli);
    return () => {
      socket.off(SocketEvents.Cli, onCli);
    };
  }, []);

  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    getSocket().emit(SocketEvents.ConsoleRun, cmd);
    setInput("");
  }

  return (
    <div className="terminal">
      <div className="terminal-bar" />
      <div className="terminal-out" ref={outRef}>
        {lines.length === 0 && <div className="empty-hint">try: help</div>}
        {lines.map((line, i) => (
          <div key={i} className={`line ${line.kind}`}>
            {line.text}
          </div>
        ))}
      </div>
      <form className="terminal-input" onSubmit={submit}>
        <span className="prompt">❯</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoFocus
        />
      </form>
    </div>
  );
}
