// Light / dark choice (UI plan U8): System follows the phone; Light and Dark override it.
// Stored on the phone; applied as data-theme on <html>, which main.tsx turns into the .dark class.
export type ThemeMode = "system" | "light" | "dark";
const KEY = "ssos.theme.v1";

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {
    /* storage blocked: still apply for this session */
  }
  applyThemeMode(mode);
}
