import { moderationConfigSchema } from "@velvet/shared";
import type { ModerationConfig } from "@velvet/shared";
import { Toggle } from "./Toggle";

interface Props {
  value: unknown;
  onChange: (value: ModerationConfig) => void;
}

export function ModerationConfigPanel({ value, onChange }: Props) {
  const cfg = moderationConfigSchema.parse(value);
  const update = (patch: Partial<ModerationConfig>) => onChange({ ...cfg, ...patch });
  const updateAutomod = (patch: Partial<ModerationConfig["automod"]>) =>
    onChange({ ...cfg, automod: { ...cfg.automod, ...patch } });

  return (
    <div className="config-panel">
      <label className="cfg-row">
        <span>Mod-log channel ID</span>
        <input
          value={cfg.modLogChannelId ?? ""}
          onChange={(e) => update({ modLogChannelId: e.target.value.trim() || undefined })}
          placeholder="e.g. 123456789012345678"
        />
      </label>

      <div className="cfg-row toggle-row">
        <span>Automod engine</span>
        <Toggle checked={cfg.automodEnabled} onChange={(v) => update({ automodEnabled: v })} />
      </div>

      <fieldset className="cfg-group" disabled={!cfg.automodEnabled}>
        <div className="cfg-row toggle-row">
          <span>Block links &amp; invites</span>
          <Toggle checked={cfg.automod.blockLinks} onChange={(v) => updateAutomod({ blockLinks: v })} />
        </div>

        <label className="cfg-row">
          <span>Blacklisted words</span>
          <textarea
            rows={2}
            value={cfg.automod.blacklist.join(", ")}
            onChange={(e) => updateAutomod({ blacklist: splitWords(e.target.value) })}
            placeholder="comma or newline separated"
          />
        </label>

        <div className="cfg-grid">
          <label className="cfg-row">
            <span>Spam: messages</span>
            <input
              type="number"
              min={2}
              value={cfg.automod.spamCount}
              onChange={(e) => updateAutomod({ spamCount: clampInt(e.target.value, 2) })}
            />
          </label>
          <label className="cfg-row">
            <span>within seconds</span>
            <input
              type="number"
              min={1}
              value={cfg.automod.spamWindowSeconds}
              onChange={(e) => updateAutomod({ spamWindowSeconds: clampInt(e.target.value, 1) })}
            />
          </label>
          <label className="cfg-row">
            <span>Timeout (minutes)</span>
            <input
              type="number"
              min={1}
              value={cfg.automod.timeoutMinutes}
              onChange={(e) => updateAutomod({ timeoutMinutes: clampInt(e.target.value, 1) })}
            />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

function splitWords(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function clampInt(input: string, min: number): number {
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) ? Math.max(min, n) : min;
}
