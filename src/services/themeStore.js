// Theme preference store — persists the user's optional theme override.
// Default ("fis") = no data-theme attribute applied; the app uses the
// CSS variables defined directly in :root via @theme.
// Optional themes ("matrix" / "cyber" / "light") set data-theme on <html>,
// triggering CSS-variable overrides in index.css.

const KEY = "fis:theme:v1";
export const VALID_THEMES = ["fis", "matrix", "cyber", "light"];
export const DEFAULT_THEME = "fis";

export function isValidTheme(value) {
  return typeof value === "string" && VALID_THEMES.includes(value);
}

export function loadTheme() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && isValidTheme(raw)) return raw;
    return DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme) {
  try {
    if (!isValidTheme(theme)) return;
    if (theme === DEFAULT_THEME) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, theme);
  } catch {
    // private browsing / quota — non-fatal
  }
}

/**
 * Applies the theme to <html> by setting (or removing) the data-theme attribute.
 * The default theme is represented by the absence of the attribute, which leaves
 * :root variables defined by @theme intact (preserves existing FIS appearance).
 */
export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!isValidTheme(theme) || theme === DEFAULT_THEME) {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}
