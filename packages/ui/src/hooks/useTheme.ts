import { useEffect, useMemo, useState } from 'react';
import { getThemeMode, setThemeMode, themeSurfaces, type ThemeSurfaceColors } from '../themes';

export type ThemeMode = 'light' | 'dark';

/**
 * useTheme — live light/dark theme with the official AngiSoft brand.
 * Fixes the legacy forced-dark ThemeContext: mode is user-selectable,
 * persisted, and applied as `.dark` + CSS variables via packages/ui/themes.
 */
export function useTheme(): {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  surfaces: ThemeSurfaceColors;
} {
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    setThemeMode(mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === 'dark',
      toggleMode: () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
      setMode: (m: ThemeMode) => setModeState(m),
      surfaces: themeSurfaces[mode],
    }),
    [mode],
  );

  return value;
}

export default useTheme;