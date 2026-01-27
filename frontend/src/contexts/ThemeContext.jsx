import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

// 5 Classic Themes for AngiSoft Company System
// Brand Primary: Teal (#14B8A6), Peach (#FFB6A3), White
export const themes = {
  // 1. AngiSoft Brand (Default) - Teal & Peach professional
  angisoft: {
    id: 'angisoft',
    name: 'AngiSoft Brand',
    description: 'Official company colors - Teal & Peach',
    colors: {
      primary: '#14B8A6',
      primaryLight: '#2DD4BF',
      primaryDark: '#0D9488',
      secondary: '#FFB6A3',
      secondaryLight: '#FECACA',
      secondaryDark: '#F97316',
      accent: '#0EA5E9',
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFB',
      backgroundTertiary: '#F0FDFA',
      surface: '#FFFFFF',
      surfaceHover: '#F0FDFA',
      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      textOnPrimary: '#FFFFFF',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      cardBg: '#FFFFFF',
      sidebarBg: '#0F172A',
      sidebarText: '#F8FAFC',
      sidebarHover: '#1E293B',
      headerBg: '#FFFFFF',
    },
    dark: {
      background: '#0F172A',
      backgroundSecondary: '#1E293B',
      backgroundTertiary: '#334155',
      surface: '#1E293B',
      surfaceHover: '#334155',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#64748B',
      border: '#334155',
      borderLight: '#475569',
      cardBg: '#1E293B',
      sidebarBg: '#020617',
      sidebarText: '#F8FAFC',
      sidebarHover: '#0F172A',
      headerBg: '#1E293B',
    }
  },

  // 2. Corporate Blue - Professional enterprise look
  corporate: {
    id: 'corporate',
    name: 'Corporate Blue',
    description: 'Professional enterprise style',
    colors: {
      primary: '#2563EB',
      primaryLight: '#3B82F6',
      primaryDark: '#1D4ED8',
      secondary: '#7C3AED',
      secondaryLight: '#8B5CF6',
      secondaryDark: '#6D28D9',
      accent: '#06B6D4',
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAFC',
      backgroundTertiary: '#EFF6FF',
      surface: '#FFFFFF',
      surfaceHover: '#EFF6FF',
      text: '#1E293B',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      textOnPrimary: '#FFFFFF',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#0284C7',
      cardBg: '#FFFFFF',
      sidebarBg: '#1E3A5F',
      sidebarText: '#F8FAFC',
      sidebarHover: '#2D4A6F',
      headerBg: '#FFFFFF',
    },
    dark: {
      background: '#0F172A',
      backgroundSecondary: '#1E293B',
      backgroundTertiary: '#1E3A5F',
      surface: '#1E293B',
      surfaceHover: '#1E3A5F',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#64748B',
      border: '#334155',
      borderLight: '#475569',
      cardBg: '#1E293B',
      sidebarBg: '#020617',
      sidebarText: '#F8FAFC',
      sidebarHover: '#0F172A',
      headerBg: '#1E293B',
    }
  },

  // 3. Emerald Forest - Nature-inspired calming
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    description: 'Nature-inspired calming palette',
    colors: {
      primary: '#059669',
      primaryLight: '#10B981',
      primaryDark: '#047857',
      secondary: '#F59E0B',
      secondaryLight: '#FBBF24',
      secondaryDark: '#D97706',
      accent: '#14B8A6',
      background: '#FFFFFF',
      backgroundSecondary: '#F8FAF9',
      backgroundTertiary: '#ECFDF5',
      surface: '#FFFFFF',
      surfaceHover: '#ECFDF5',
      text: '#064E3B',
      textSecondary: '#047857',
      textMuted: '#6EE7B7',
      textOnPrimary: '#FFFFFF',
      border: '#D1FAE5',
      borderLight: '#ECFDF5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      cardBg: '#FFFFFF',
      sidebarBg: '#064E3B',
      sidebarText: '#ECFDF5',
      sidebarHover: '#047857',
      headerBg: '#FFFFFF',
    },
    dark: {
      background: '#022C22',
      backgroundSecondary: '#064E3B',
      backgroundTertiary: '#047857',
      surface: '#064E3B',
      surfaceHover: '#047857',
      text: '#ECFDF5',
      textSecondary: '#A7F3D0',
      textMuted: '#6EE7B7',
      border: '#047857',
      borderLight: '#059669',
      cardBg: '#064E3B',
      sidebarBg: '#012018',
      sidebarText: '#ECFDF5',
      sidebarHover: '#022C22',
      headerBg: '#064E3B',
    }
  },

  // 4. Sunset Orange - Warm and energetic
  sunset: {
    id: 'sunset',
    name: 'Sunset Warmth',
    description: 'Warm and energetic orange tones',
    colors: {
      primary: '#EA580C',
      primaryLight: '#F97316',
      primaryDark: '#C2410C',
      secondary: '#14B8A6',
      secondaryLight: '#2DD4BF',
      secondaryDark: '#0D9488',
      accent: '#FBBF24',
      background: '#FFFFFF',
      backgroundSecondary: '#FFFBF5',
      backgroundTertiary: '#FFF7ED',
      surface: '#FFFFFF',
      surfaceHover: '#FFF7ED',
      text: '#7C2D12',
      textSecondary: '#9A3412',
      textMuted: '#FDBA74',
      textOnPrimary: '#FFFFFF',
      border: '#FED7AA',
      borderLight: '#FFEDD5',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#0EA5E9',
      cardBg: '#FFFFFF',
      sidebarBg: '#7C2D12',
      sidebarText: '#FFF7ED',
      sidebarHover: '#9A3412',
      headerBg: '#FFFFFF',
    },
    dark: {
      background: '#431407',
      backgroundSecondary: '#7C2D12',
      backgroundTertiary: '#9A3412',
      surface: '#7C2D12',
      surfaceHover: '#9A3412',
      text: '#FFF7ED',
      textSecondary: '#FED7AA',
      textMuted: '#FDBA74',
      border: '#9A3412',
      borderLight: '#C2410C',
      cardBg: '#7C2D12',
      sidebarBg: '#2D1006',
      sidebarText: '#FFF7ED',
      sidebarHover: '#431407',
      headerBg: '#7C2D12',
    }
  },

  // 5. Midnight Purple - Modern dark premium
  midnight: {
    id: 'midnight',
    name: 'Midnight Purple',
    description: 'Modern dark premium look',
    colors: {
      primary: '#8B5CF6',
      primaryLight: '#A78BFA',
      primaryDark: '#7C3AED',
      secondary: '#EC4899',
      secondaryLight: '#F472B6',
      secondaryDark: '#DB2777',
      accent: '#06B6D4',
      background: '#FAFAFB',
      backgroundSecondary: '#F5F3FF',
      backgroundTertiary: '#EDE9FE',
      surface: '#FFFFFF',
      surfaceHover: '#F5F3FF',
      text: '#1E1B4B',
      textSecondary: '#4338CA',
      textMuted: '#A5B4FC',
      textOnPrimary: '#FFFFFF',
      border: '#E0E7FF',
      borderLight: '#EEF2FF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      cardBg: '#FFFFFF',
      sidebarBg: '#1E1B4B',
      sidebarText: '#E0E7FF',
      sidebarHover: '#312E81',
      headerBg: '#FFFFFF',
    },
    dark: {
      background: '#0F0D1A',
      backgroundSecondary: '#1E1B4B',
      backgroundTertiary: '#312E81',
      surface: '#1E1B4B',
      surfaceHover: '#312E81',
      text: '#F5F3FF',
      textSecondary: '#C4B5FD',
      textMuted: '#A78BFA',
      border: '#312E81',
      borderLight: '#4338CA',
      cardBg: '#1E1B4B',
      sidebarBg: '#0A0812',
      sidebarText: '#E0E7FF',
      sidebarHover: '#0F0D1A',
      headerBg: '#1E1B4B',
    }
  },
};

// Get theme colors based on mode (light/dark)
const getThemeColors = (themeId, mode) => {
  const theme = themes[themeId] || themes.angisoft;
  if (mode === 'dark') {
    return {
      ...theme.colors,
      ...theme.dark,
    };
  }
  return theme.colors;
};

// Create MUI theme from our theme
const createMuiTheme = (themeId, mode) => {
  const colors = getThemeColors(themeId, mode);
  
  return createTheme({
    palette: {
      mode,
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
      success: { main: colors.success },
      divider: colors.border,
    },
    typography: {
      fontFamily: "'Inter', 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      h1: { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 600 },
      h4: { fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontWeight: 600 },
      h5: { fontFamily: "'Inter', sans-serif", fontWeight: 600 },
      h6: { fontFamily: "'Inter', sans-serif", fontWeight: 600 },
      button: { fontWeight: 500, textTransform: 'none' },
    },
    shape: {
      borderRadius: 12,
    },
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
          root: {
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

// Apply CSS variables to document
const applyCssVariables = (themeId, mode) => {
  const colors = getThemeColors(themeId, mode);
  const root = document.documentElement;
  
  // Set all CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
  
  // Set additional computed variables
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`);
  root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.secondaryLight} 100%)`);
  root.style.setProperty('--gradient-accent', `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`);
  root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgb(0 0 0 / 0.05)');
  root.style.setProperty('--shadow-md', '0 4px 6px -1px rgb(0 0 0 / 0.1)');
  root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgb(0 0 0 / 0.1)');
  root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgb(0 0 0 / 0.1)');
  
  // Set class for mode
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Set theme attribute
  root.setAttribute('data-theme', themeId);
};

// Context
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Provider
export const ThemeProvider = ({ children }) => {
  const getInitialTheme = () => {
    const saved = localStorage.getItem('angisoft-theme');
    return saved && themes[saved] ? saved : 'angisoft';
  };
  
  const getInitialMode = () => {
    const saved = localStorage.getItem('angisoft-mode');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [themeId, setThemeId] = useState(getInitialTheme);
  const [mode, setMode] = useState(getInitialMode);

  // Apply theme when changed
  useEffect(() => {
    applyCssVariables(themeId, mode);
    localStorage.setItem('angisoft-theme', themeId);
    localStorage.setItem('angisoft-mode', mode);
  }, [themeId, mode]);

  // Create MUI theme
  const muiTheme = useMemo(() => createMuiTheme(themeId, mode), [themeId, mode]);
  
  // Get current theme colors
  const colors = useMemo(() => getThemeColors(themeId, mode), [themeId, mode]);

  const value = useMemo(() => ({
    themeId,
    mode,
    colors,
    currentTheme: themes[themeId],
    allThemes: themes,
    setTheme: (id) => {
      if (themes[id]) setThemeId(id);
    },
    toggleMode: () => setMode(prev => prev === 'light' ? 'dark' : 'light'),
    setMode,
    isDark: mode === 'dark',
  }), [themeId, mode, colors]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
