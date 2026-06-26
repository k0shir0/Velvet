import {
  MODULE_CONFIG_FIELDS,
  MODULE_CONFIG_SCHEMAS,
} from "@velvet/shared";
import type { ConfigField, GuildInfo, ModuleId } from "@velvet/shared";
import { Toggle } from "./Toggle";

interface Props {
  moduleId: ModuleId;
  value: unknown;
  guild: GuildInfo | null;
  onChange: (next: Record<string, unknown>) => void;
}

/** Renders an in-depth config form for any module from its field descriptors. */
export function ConfigForm({ moduleId, value, guild, onChange }: Props) {
  const cfg = MODULE_CONFIG_SCHEMAS[moduleId].parse(value) as Record<string, unknown>;
  const fields = MODULE_CONFIG_FIELDS[moduleId];
  const set = (path: string, v: unknown) => onChange(setPath(cfg, path, v));

  return (
    <div className="config-panel">
      {fields.map((field) => {
        const disabled = field.dependsOn ? !getPath(cfg, field.dependsOn) : false;
        return (
          <div key={field.key}>
            {field.section && <div className="cfg-section">{field.section}</div>}
            <Field field={field} cfg={cfg} guild={guild} disabled={disabled} onSet={set} />
          </div>
        );
      })}
    </div>
  );
}

function Field({
  field,
  cfg,
  guild,
  disabled,
  onSet,
}: {
  field: ConfigField;
  cfg: Record<string, unknown>;
  guild: GuildInfo | null;
  disabled: boolean;
  onSet: (path: string, v: unknown) => void;
}) {
  const raw = getPath(cfg, field.key);

  if (field.type === "boolean") {
    return (
      <div className={`cfg-row toggle-row ${disabled ? "disabled" : ""}`}>
        <span>{field.label}</span>
        <Toggle checked={Boolean(raw)} onChange={(v) => !disabled && onSet(field.key, v)} />
      </div>
    );
  }

  const textChannels = guild?.channels.filter((c) => c.type === "text") ?? [];
  const voiceChannels = guild?.channels.filter((c) => c.type === "voice") ?? [];

  return (
    <label className={`cfg-row ${disabled ? "disabled" : ""}`}>
      <span>
        {field.label}
        {field.help && <em className="cfg-help"> — {field.help}</em>}
      </span>

      {field.type === "number" && (
        <input
          type="number"
          disabled={disabled}
          min={field.min}
          max={field.max}
          value={Number(raw ?? 0)}
          onChange={(e) => onSet(field.key, clampInt(e.target.value, field.min ?? 0, field.max))}
        />
      )}

      {field.type === "text" && (
        <input
          type="text"
          disabled={disabled}
          placeholder={field.placeholder}
          value={String(raw ?? "")}
          onChange={(e) => onSet(field.key, e.target.value || undefined)}
        />
      )}

      {field.type === "longtext" && (
        <textarea
          rows={2}
          disabled={disabled}
          placeholder={field.placeholder}
          value={String(raw ?? "")}
          onChange={(e) => onSet(field.key, e.target.value)}
        />
      )}

      {field.type === "stringList" && (
        <textarea
          rows={2}
          disabled={disabled}
          placeholder={field.placeholder ?? "comma or newline separated"}
          value={asArray(raw).join(", ")}
          onChange={(e) => onSet(field.key, splitList(e.target.value))}
        />
      )}

      {field.type === "channel" &&
        (guild?.available ? (
          <select
            disabled={disabled}
            value={String(raw ?? "")}
            onChange={(e) => onSet(field.key, e.target.value || undefined)}
          >
            <option value="">— none —</option>
            {textChannels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            disabled={disabled}
            placeholder="channel ID"
            value={String(raw ?? "")}
            onChange={(e) => onSet(field.key, e.target.value || undefined)}
          />
        ))}

      {field.type === "voiceChannel" &&
        (guild?.available ? (
          <select
            disabled={disabled}
            value={String(raw ?? "")}
            onChange={(e) => onSet(field.key, e.target.value || undefined)}
          >
            <option value="">— none —</option>
            {voiceChannels.map((c) => (
              <option key={c.id} value={c.id}>
                🔊 {c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            disabled={disabled}
            placeholder="voice channel ID"
            value={String(raw ?? "")}
            onChange={(e) => onSet(field.key, e.target.value || undefined)}
          />
        ))}

      {field.type === "channelList" &&
        (guild?.available ? (
          <div className="chip-list">
            {textChannels.map((c) => {
              const selected = asArray(raw).includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  className={`chip ${selected ? "on" : ""}`}
                  disabled={disabled}
                  onClick={() => onSet(field.key, toggleItem(asArray(raw), c.id))}
                >
                  #{c.name}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            rows={2}
            disabled={disabled}
            placeholder="channel IDs, comma separated"
            value={asArray(raw).join(", ")}
            onChange={(e) => onSet(field.key, splitList(e.target.value))}
          />
        ))}
    </label>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => {
    if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const root: Record<string, unknown> = { ...obj };
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    const child = cur[k];
    cur[k] = child && typeof child === "object" ? { ...(child as Record<string, unknown>) } : {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]!] = value;
  return root;
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function splitList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function clampInt(input: string, min: number, max?: number): number {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n)) return min;
  const lower = Math.max(min, n);
  return max !== undefined ? Math.min(max, lower) : lower;
}
