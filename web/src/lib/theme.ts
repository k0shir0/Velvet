export type ThemeName = "velvet" | "mint";

const KEY = "velvet_theme";

export const THEMES: { id: ThemeName; label: string }[] = [
  { id: "velvet", label: "Velvet" },
  { id: "mint", label: "Mint" },
];

export function getTheme(): ThemeName {
  return localStorage.getItem(KEY) === "mint" ? "mint" : "velvet";
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(KEY, theme);
}
