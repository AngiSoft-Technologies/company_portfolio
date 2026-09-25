import { colors, motion, radius, semantic, typography } from '../tokens';

type ThemeMode = 'light' | 'dark';

export interface ThemeSurfaceColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  cardBg: string;
}

const darkSurface: ThemeSurfaceColors = {
  background: colors.navy,
  backgroundSecondary: colors.navyLight,
  surface: colors.navyLight,
  surfaceHover: colors.navyLighter,
  text: colors.offWhite,
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: semantic.border.dark,
  borderLight: 'rgba(215, 227, 255, 0.14)',
  cardBg: 'rgba(11, 30, 61, 0.78)',
};

const lightSurface: ThemeSurfaceColors = {
  background: colors.offWhite,
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#F8FAFC',
  text: colors.navy,
  textSecondary: '#334155',
  textMuted: '#64748B',
  border: semantic.border.light,
  borderLight: 'rgba(15, 23, 42, 0.08)',
  cardBg: 'rgba(255, 255, 255, 0.9)',
};

export const themeSurfaces: Record<ThemeMode, ThemeSurfaceColors> = {
  dark: darkSurface,
  light: lightSurface,
};

/** Write every token as a CSS custom property on :root and set data-theme. */
export function applyCssVariables(mode: ThemeMode = 'dark'): void {
  const root = document.documentElement;
  const surf = themeSurfaces[mode];

  const flat = {
    '--color-primary': colors.primary,
    '--color-primary-light': colors.primaryLight,
    '--color-primary-dark': colors.primaryDark,
    '--color-secondary': colors.secondary,
    '--color-secondary-light': colors.secondaryLight,
    '--color-secondary-dark': colors.secondaryDark,
    '--color-accent': colors.accent,
    '--color-success': colors.success,
    '--color-warning': colors.warning,
    '--color-error': colors.error,
    '--color-navy': colors.navy,
    '--color-navy-light': colors.navyLight,
    '--color-off-white': colors.offWhite,

    '--bg-primary': surf.background,
    '--bg-secondary': surf.backgroundSecondary,
    '--surface': surf.surface,
    '--surface-hover': surf.surfaceHover,
    '--text-primary': surf.text,
    '--text-secondary': surf.textSecondary,
    '--text-muted': surf.textMuted,
    '--border': surf.border,
    '--border-light': surf.borderLight,
    '--card-bg': surf.cardBg,

    '--gradient-primary': `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    '--gradient-secondary': `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.success} 100%)`,
    '--gradient-brand': `linear-gradient(135deg, #18D8FF 0%, ${colors.primary} 45%, ${colors.primaryDark} 100%)`,

    '--font-display': typography.fontFamily.display,
    '--font-body': typography.fontFamily.body,

    '--radius-sm': radius.sm,
    '--radius-md': radius.md,
    '--radius-lg': radius.lg,
    '--radius-xl': radius.xl,
    '--radius-2xl': radius['2xl'],

    '--elevation-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--elevation-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '--elevation-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

    '--duration-fast': motion.duration.fast,
    '--duration-normal': motion.duration.normal,
    '--ease-standard': motion.easing.standard,
  };

  Object.entries(flat).forEach(([key, value]) => root.style.setProperty(key, value));
  root.setAttribute('data-theme', mode);
}

/** Toggle the document-level `.dark` class and re-apply CSS vars. */
export function setThemeMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  applyCssVariables(mode);
}

export function getThemeMode(): ThemeMode {
  const saved = localStorage.getItem('angisoft-theme-mode');
  return saved === 'light' ? 'light' : 'dark';
}

export default applyCssVariables;