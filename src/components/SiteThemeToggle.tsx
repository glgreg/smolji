"use client";

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  ColorScheme,
  THEME_EVENT_NAME,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getStoredThemeOverride,
  resolveTheme,
  toggleThemePreference,
} from '../utils/theme';

interface SiteThemeToggleProps {
  className?: string;
}

/**
 * Accessible two-state theme toggle synced across tabs, OS changes, and the studio playground.
 */
export function SiteThemeToggle({ className = '' }: SiteThemeToggleProps) {
  const [, setTheme] = useState<ColorScheme>('light');

  useEffect(() => {
    setTheme(resolveTheme());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        const next = resolveTheme();
        applyThemeToDocument(next, getStoredThemeOverride());
        setTheme(next);
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<ColorScheme>).detail;
      if (detail === 'light' || detail === 'dark') {
        setTheme(detail);
      } else {
        setTheme(resolveTheme());
      }
    };

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const handleMediaChange = () => {
      const override = getStoredThemeOverride();
      if (!override) {
        const next = resolveTheme();
        applyThemeToDocument(next, null);
        setTheme(next);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(THEME_EVENT_NAME, handleCustomEvent);
    mediaQuery?.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(THEME_EVENT_NAME, handleCustomEvent);
      mediaQuery?.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleThemePreference(resolveTheme()))}
      title="Toggle theme"
      className={`inline-flex items-center justify-center min-w-9 min-h-9 p-2 rounded-xl border border-[#8f8578] dark:border-[#756c61] bg-[#fdfbf7] dark:bg-[#1f1d1a] text-[#1b1917] dark:text-[#f4efe6] hover:border-[#c23e1a] dark:hover:border-[#f06a43] transition-colors cursor-pointer ${className}`}
    >
      <span className="theme-when-dark items-center justify-center">
        <Sun className="w-4 h-4 text-[#f06a43]" aria-hidden="true" />
        <span className="visually-hidden">Switch to light theme</span>
      </span>
      <span className="theme-when-light items-center justify-center">
        <Moon className="w-4 h-4 text-[#5b534b]" aria-hidden="true" />
        <span className="visually-hidden">Switch to dark theme</span>
      </span>
    </button>
  );
}
