import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

// AngiSoft Official Brand — "Innovate • Build • Empower"
const angisoft = {
  id: 'angisoft',
  name: 'AngiSoft Brand',
  description: 'Innovate • Build • Empower',
  colors: {
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
    background: '#07142B',
    backgroundSecondary: '#0B1E3D',
    backgroundTertiary: '#102A55',
    surface: '#0B1E3D',
    surfaceHover: '#102A55',
    text: '#F5F7FA',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    border: 'rgba(0, 175, 255, 0.22)',
    borderLight: 'rgba(215, 227, 255, 0.14)',
    cardBg: 'rgba(11, 30, 61, 0.78)',
    sidebarBg: '#07142B',
    sidebarText: '#F5F7FA',
    sidebarHover: '#0B1E3D',
    headerBg: 'rgba(7, 20, 43, 0.92)',
    brandBlue: '#0875FF',
    brandCyan: '#00AFFF',
    brandGreen: '#27D94B',
    brandNavy: '#07142B',
    brandOffWhite: '#F5F7FA',
    brandGlow: '#18D8FF',
  },
};

const createMuiTheme = (colors) => {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
        contrastText: colors.textOnPrimary,
      },
      secondary: {
        main: colors.secondary,
        light: colors.secondaryLight,
        dark: colors.secondaryDark,
      },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
      error: { main: colors.error },
      warning: { main: colors.warning },
      info: { main: colors.info },
      success: { main: colors.successDark },
      divider: colors.border,
    },
    typography: {
      fontFamily: "'DM Sans', system-ui, sans-serif",
      h1: { fontFamily: "'Sora', 'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: "'Sora', 'DM Sans', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontFamily: "'Sora', 'DM Sans', sans-serif", fontWeight: 600 },
      h4: { fontFamily: "'Sora', 'DM Sans', sans-serif", fontWeight: 600 },
      h5: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600 },
      h6: { fontFamily: "'DM Sans', sans-serif", fontWeight: 600 },
      button: { fontWeight: 500, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      ...Array(18).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '10px 20px', fontWeight: 500 },
          contained: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            '&:hover': { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
          },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 16, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
    },
  });
};

const applyCssVariables = (colors) => {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`);
  root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.success} 100%)`);
  root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`);
  root.style.setProperty('--gradient-brand', `linear-gradient(135deg, #18D8FF 0%, #0875FF 45%, #003BCE 100%)`);
  root.setAttribute('data-theme', 'angisoft');
};

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  const colors = angisoft.colors;
  const muiTheme = useMemo(() => createMuiTheme(colors), []);

  useEffect(() => {
    applyCssVariables(colors);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleMode = () => {
    setIsDark(true);
    localStorage.setItem('angisoft-theme-mode', 'dark');
  };

  const value = useMemo(() => ({
    themeId: 'angisoft',
    colors,
    currentTheme: angisoft,
    isDark,
    mode: isDark ? 'dark' : 'light',
    toggleMode,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
