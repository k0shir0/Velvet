import { useEffect, useState } from "react";
import type { ChannelPermissionInfo, PermissionAudit } from "@velvet/shared";
import { getPermissions } from "../lib/api";

export function Permissions() {
  const [data, setData] = useState<PermissionAudit | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    getPermissions()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  if (loading && !data) return <div className="empty-hint">Loading permissions…</div>;
  if (!data?.available) {
    return (
      <div className="empty-hint">
        The bot isn't connected to a guild yet — start it to audit channel permissions.
      </div>
    );
  }

  const sortByPos = (a: ChannelPermissionInfo, b: ChannelPermissionInfo) => a.position - b.position;
  const categories = data.channels.filter((c) => c.type === "category").sort(sortByPos);
  const orphans = data.channels.filter((c) => c.type !== "category" && !c.parentId).sort(sortByPos);
  const childrenOf = (id: string) =>
    data.channels.filter((c) => c.parentId === id && c.type !== "category").sort(sortByPos);

  const privateCount = data.channels.filter((c) => c.private).length;

  return (
    <div className="perms">
      <div className="perms-head">
        <span>
          {data.channels.length} channels · <b>{privateCount}</b> private
        </span>
        <span className="spacer" />
        <button className="ghost-btn" onClick={refresh}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {orphans.length > 0 && (
        <div className="perm-cat">
          <div className="perm-cat-name">No category</div>
          {orphans.map((ch) => (
            <ChannelRow key={ch.id} ch={ch} />
          ))}
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat.id} className="perm-cat">
          <div className="perm-cat-name">
            {cat.name}
            {cat.private && <span className="lock"> 🔒</span>}
          </div>
          {childrenOf(cat.id).map((ch) => (
            <ChannelRow key={ch.id} ch={ch} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ChannelRow({ ch }: { ch: ChannelPermissionInfo }) {
  return (
    <div className="perm-row">
      <span className="perm-chan">
        {ch.type === "voice" ? "🔊" : "#"} {ch.name}
      </span>
      <span className={`perm-badge ${ch.private ? "private" : "public"}`}>
        {ch.private ? "private" : "public"}
      </span>
      <span className="perm-roles">
        {ch.private ? (
          ch.allowedRoles.length > 0 ? (
            ch.allowedRoles.map((r) => (
              <span key={r.id} className="role-chip">
                {r.name}
              </span>
            ))
          ) : (
            <span className="perm-faint">no roles</span>
          )
        ) : (
          <span className="perm-faint">@everyone</span>
        )}
      </span>
    </div>
  );
}
