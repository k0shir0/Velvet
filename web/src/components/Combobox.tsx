import { useEffect, useRef, useState } from "react";

export interface ComboOption {
  id: string;
  label: string;
}

interface Props {
  options: ComboOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** A searchable single-select dropdown: pick from the list or type to filter. */
export function Combobox({ options, value, onChange, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div className={`combo ${disabled ? "disabled" : ""}`} ref={ref}>
      <input
        className="combo-input"
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        placeholder={placeholder ?? "Search…"}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {value && !open && (
        <button
          type="button"
          className="combo-clear"
          onClick={() => onChange("")}
          aria-label="Clear"
        >
          ×
        </button>
      )}
      {open && (
        <div className="combo-list">
          {filtered.length === 0 ? (
            <div className="combo-empty">No matches</div>
          ) : (
            filtered.slice(0, 60).map((o) => (
              <button
                type="button"
                key={o.id}
                className={`combo-option ${o.id === value ? "sel" : ""}`}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
