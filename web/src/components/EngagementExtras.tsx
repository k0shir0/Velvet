import { useEffect, useState } from "react";
import type {
  GuildInfo,
  LeaderboardEntry,
  ReactionRolePair,
  ReactionRoleSet,
} from "@velvet/shared";
import {
  deleteReactionRole,
  deployReactionRole,
  getLeaderboard,
  getReactionRoles,
} from "../lib/api";
import { Combobox } from "./Combobox";

export function EngagementExtras({ guild }: { guild: GuildInfo | null }) {
  return (
    <div className="extras">
      <Leaderboard />
      <ReactionRoleManager guild={guild} />
    </div>
  );
}

function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    getLeaderboard()
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  return (
    <section className="extra-block">
      <div className="extra-head">
        <h3>Leaderboard</h3>
        <button className="ghost-btn" onClick={refresh}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="empty-hint">No XP yet — enable Engagement and chat to start earning.</div>
      ) : (
        <div className="lb">
          {entries.map((e) => (
            <div key={e.userId} className="lb-row">
              <span className="lb-rank">#{e.rank}</span>
              <span className="lb-tag">{e.tag}</span>
              <span className="lb-lvl">lvl {e.level}</span>
              <span className="lb-xp">{e.xp.toLocaleString()} xp</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReactionRoleManager({ guild }: { guild: GuildInfo | null }) {
  const [sets, setSets] = useState<ReactionRoleSet[]>([]);
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [pairs, setPairs] = useState<ReactionRolePair[]>([{ emoji: "", roleId: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getReactionRoles()
      .then((r) => setSets(r.sets))
      .catch(() => setSets([]));
  }
  useEffect(refresh, []);

  const textChannels = guild?.channels.filter((c) => c.type === "text") ?? [];
  const roles = guild?.roles ?? [];
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const channelName = (id: string) => guild?.channels.find((c) => c.id === id)?.name ?? id;

  const updatePair = (i: number, patch: Partial<ReactionRolePair>) =>
    setPairs((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addPair = () => setPairs((p) => [...p, { emoji: "", roleId: "" }]);
  const removePair = (i: number) => setPairs((p) => p.filter((_, idx) => idx !== i));

  async function deploy() {
    setBusy(true);
    setError(null);
    try {
      const valid = pairs.filter((p) => p.emoji.trim() && p.roleId);
      if (!channelId || valid.length === 0) {
        throw new Error("Pick a channel and at least one emoji → role pair.");
      }
      await deployReactionRole({ channelId, title: title.trim() || undefined, pairs: valid });
      setTitle("");
      setPairs([{ emoji: "", roleId: "" }]);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(messageId: string) {
    await deleteReactionRole(messageId).catch(() => {});
    refresh();
  }

  return (
    <section className="extra-block">
      <div className="extra-head">
        <h3>Reaction Roles</h3>
      </div>

      {sets.length > 0 && (
        <div className="rr-list">
          {sets.map((s) => (
            <div key={s.messageId} className="rr-set">
              <div className="rr-set-head">
                <span>#{channelName(s.channelId)}</span>
                <button className="ghost-btn" onClick={() => remove(s.messageId)}>
                  Remove
                </button>
              </div>
              <div className="rr-pairs">
                {s.pairs.map((p, i) => (
                  <span key={i} className="rr-chip">
                    {p.emoji} → {roleName(p.roleId)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rr-form">
        <div className="cfg-row">
          <span>Channel</span>
          {guild?.available ? (
            <Combobox
              options={textChannels.map((c) => ({ id: c.id, label: `#${c.name}` }))}
              value={channelId}
              placeholder="Search channels…"
              onChange={setChannelId}
            />
          ) : (
            <input
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="channel ID"
            />
          )}
        </div>
        <div className="cfg-row">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reaction Roles" />
        </div>

        <div className="cfg-section">Emoji → Role</div>
        {pairs.map((p, i) => (
          <div key={i} className="rr-pair-edit">
            <input
              className="rr-emoji"
              value={p.emoji}
              onChange={(e) => updatePair(i, { emoji: e.target.value })}
              placeholder="😀"
            />
            {guild?.available ? (
              <select value={p.roleId} onChange={(e) => updatePair(i, { roleId: e.target.value })}>
                <option value="">— role —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={p.roleId}
                onChange={(e) => updatePair(i, { roleId: e.target.value })}
                placeholder="role ID"
              />
            )}
            <button className="ghost-btn" onClick={() => removePair(i)} disabled={pairs.length === 1}>
              ✕
            </button>
          </div>
        ))}
        <button className="configure-btn" onClick={addPair}>
          + Add pair
        </button>

        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" onClick={deploy} disabled={busy}>
          {busy ? "Deploying…" : "Deploy embed"}
        </button>
      </div>
    </section>
  );
}
