export type ColorScheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'smolji_theme';
export const THEME_EVENT_NAME = 'smolji-theme-change';

/**
 * Reads the current OS/browser color scheme preference.
 */
export function getSystemScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Reads the persisted explicit theme override, if any.
 */
export function getStoredThemeOverride(): ColorScheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') {
      return raw;
    }
  } catch {
    // localStorage access blocked
  }
  return null;
}

/**
 * Computes the active theme from stored override or system preference.
 */
export function resolveTheme(): ColorScheme {
  return getStoredThemeOverride() ?? getSystemScheme();
}

/**
 * Synchronizes both the document root class and `<meta name="color-scheme">`.
 */
export function applyThemeToDocument(resolved: ColorScheme, override: ColorScheme | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', override ?? 'light dark');
  }
}

/**
 * Toggles the current visual theme against the OS preference, returning the next active scheme.
 * Stores an explicit override when differing from system, or clears storage when returning to system.
 */
export function toggleThemePreference(currentRendered: ColorScheme): ColorScheme {
  const next: ColorScheme = currentRendered === 'dark' ? 'light' : 'dark';
  const system = getSystemScheme();
  const override: ColorScheme | null = next === system ? null : next;

  try {
    if (override) {
      window.localStorage.setItem(THEME_STORAGE_KEY, override);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // storage unavailable
  }

  applyThemeToDocument(next, override);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ColorScheme>(THEME_EVENT_NAME, { detail: next }));
  }
  return next;
}
