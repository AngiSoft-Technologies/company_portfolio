import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTheme as useAngisoftTheme, type ThemeMode, type ThemeSurfaceColors } from '@angisoft/ui';

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeSurfaceColors & Record<string, string>;
}

const brandColors = {
  primary: '#0875FF',
  primaryLight: '#3B9AFF',
  primaryDark: '#003BCE',
  secondary: '#00AFFF',
  secondaryLight: '#18D8FF',
  secondaryDark: '#0088CC',
  accent: '#18D8FF',
  success: '#27D94B',
  successDark: '#1EB83D',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#00AFFF',
  borderLight: 'rgba(215, 227, 255, 0.14)',
  textOnPrimary: '#FFFFFF',
  brandBlue: '#0875FF',
  brandCyan: '#00AFFF',
  brandGreen: '#27D94B',
  brandNavy: '#07142B',
  brandOffWhite: '#F5F7FA',
  brandGlow: '#18D8FF',
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  isDark: true,
  toggleMode: () => {},
  setMode: () => {},
  colors: brandColors as unknown as ThemeContextValue['colors'],
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAngisoftTheme();
  const value = useMemo<ThemeContextValue>(() => ({
    mode: theme.mode,
    isDark: theme.isDark,
    toggleMode: theme.toggleMode,
    setMode: theme.setMode,
    colors: {
      ...brandColors,
      ...theme.surfaces,
      background: theme.surfaces.background,
      backgroundSecondary: theme.surfaces.backgroundSecondary,
      surface: theme.surfaces.surface,
      surfaceHover: theme.surfaces.surfaceHover,
      text: theme.surfaces.text,
      textSecondary: theme.surfaces.textSecondary,
      textMuted: theme.surfaces.textMuted,
      border: theme.surfaces.border,
      cardBg: theme.surfaces.cardBg,
    },
  }), [theme.mode, theme.isDark, theme.toggleMode, theme.setMode, theme.surfaces]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export { ThemeContext };
export default ThemeProvider;
