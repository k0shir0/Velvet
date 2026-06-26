import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "../lib/api";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="brand-mark" />
        <h2>Velvet</h2>
        <p>Enter the control-panel password</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Unlocking…" : "Unlock Panel"}
        </button>
        <div className="error">{error}</div>
      </form>
    </div>
  );
}
