interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}
