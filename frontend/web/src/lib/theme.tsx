import { createContext, useMemo, type ReactNode } from 'react';
import { useTheme } from '@angisoft/ui';
import type { ThemeMode } from '@angisoft/ui';

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  isDark: true,
  toggleMode: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: theme.mode,
      isDark: theme.isDark,
      toggleMode: theme.toggleMode,
      setMode: theme.setMode,
    }),
    [theme.mode, theme.isDark, theme.toggleMode, theme.setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
export default ThemeProvider;