import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  getThemeMode,
  getThemeName,
  setThemeMode,
  themeSurfaces,
  themes,
  type ThemeSurfaceColors,
} from '../themes';

export type ThemeMode = 'light' | 'dark';
export type ThemeName = keyof typeof themes | string;

const THEME_NAME_KEY = 'angisoft-theme-name';

/**
 * useTheme — live light/dark theme with selectable brand palettes.
 * Mode follows the device preference unless the user overrides it; the named
 * theme (accent palette) is persisted separately and applied as CSS variables.
 */
export function useTheme(): {
  mode: ThemeMode;
  isDark: boolean;
  theme: string;
  themeLabel: string;
  availableThemes: { name: string; label: string }[];
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setTheme: (name: string) => void;
  surfaces: ThemeSurfaceColors;
} {
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeMode());
  const [theme, setThemeState] = useState<string>(() => getThemeName());

  useLayoutEffect(() => {
    localStorage.setItem('angisoft-theme-mode', mode);
    setThemeMode(mode, theme);
  }, [mode, theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'angisoft-theme-mode') {
        setModeState(event.newValue === 'light' ? 'light' : 'dark');
      }
      if (event.key === THEME_NAME_KEY) {
        setThemeState(getThemeName());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      theme,
      themeLabel: themes[theme]?.label ?? theme,
      availableThemes: Object.values(themes).map((t) => ({ name: t.name, label: t.label })),
      toggleMode: () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
      setMode: (m: ThemeMode) => setModeState(m),
      setTheme: (name: string) => {
        if (themes[name]) {
          localStorage.setItem(THEME_NAME_KEY, name);
          setThemeState(name);
        }
      },
      surfaces: themeSurfaces[mode],
    }),
    [mode, theme],
  );

  return value;
}

export default useTheme;
