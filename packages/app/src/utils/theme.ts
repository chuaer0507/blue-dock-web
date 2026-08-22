export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'blue-dock-theme';

export function isThemePreference(raw: string | null | undefined): raw is ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system';
}

export function readThemePreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(saved) ? saved : 'system';
}

export function writeThemePreference(theme: ThemePreference): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 同步 DOM：`class` + `data-theme`（HeroUI v3） */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
}
