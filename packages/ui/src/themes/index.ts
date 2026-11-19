import { brandGradients, colors, motion, radius, semantic, typography } from '../tokens';

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

/** Brand identity for one theme. Surfaces are shared; these are the accents. */
export interface ThemeBrand {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  /** Secondary brand accent (the "pop" colour, e.g. green in the default theme). */
  accent2: string;
  success: string;
  gradient: string;
}

export interface ThemeDefinition {
  name: string;
  label: string;
  brand: ThemeBrand;
}

const darkSurface: ThemeSurfaceColors = {
  background: colors.navy,
  backgroundSecondary: colors.navyLight,
  surface: '#0D2344',
  surfaceHover: colors.navyLighter,
  text: colors.offWhite,
  textSecondary: '#C7D2E0',
  textMuted: '#94A3B8',
  border: semantic.border.dark,
  borderLight: 'rgba(148, 163, 184, 0.12)',
  cardBg: 'rgba(13, 35, 68, 0.92)',
};

/**
 * Light surfaces are deliberately brand-tinted, not neutral white.
 *
 * A pure `#FFFFFF` / `#F5F7FA` pair made every light-theme surface collapse to
 * the same value, so sections lost their separation and low-contrast text
 * (`#64748B` on white) sat on the same white as the background. These values
 * keep a cool paper base with enough chroma to tint surfaces, and darken the
 * muted text ramp so secondary copy clears WCAG AA on light backgrounds.
 */
const lightSurface: ThemeSurfaceColors = {
  background: '#F2F6FD',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#E9F1FE',
  text: colors.navy,
  textSecondary: '#334A6B',
  textMuted: '#5A7291',
  border: 'rgba(8, 117, 255, 0.16)',
  borderLight: 'rgba(8, 117, 255, 0.1)',
  cardBg: '#FFFFFF',
};

export const themeSurfaces: Record<ThemeMode, ThemeSurfaceColors> = {
  dark: darkSurface,
  light: lightSurface,
};

/* --------------------------------------------------------------------------
   Theme registry — the single source of truth for brand identity.
   Every accent colour in the product resolves through one of these palettes;
   components must never hardcode a hex. Add a theme here and it becomes
   selectable everywhere automatically.
   -------------------------------------------------------------------------- */

const angisoftBrand: ThemeBrand = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  primaryDark: colors.primaryDark,
  secondary: colors.secondary,
  secondaryLight: colors.secondaryLight,
  secondaryDark: colors.secondaryDark,
  accent: colors.accent,
  accent2: colors.success,
  success: colors.success,
  gradient: brandGradients.brandSweep,
};

export const themes: Record<string, ThemeDefinition> = {
  angisoft: {
    name: 'angisoft',
    label: 'AngiSoft Blue',
    brand: angisoftBrand,
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    brand: {
      primary: '#0369A1',
      primaryLight: '#0EA5E9',
      primaryDark: '#075985',
      secondary: '#06B6D4',
      secondaryLight: '#22D3EE',
      secondaryDark: '#0891B2',
      accent: '#22D3EE',
      accent2: '#10B981',
      success: '#10B981',
      gradient: 'linear-gradient(90deg, #082F49 0%, #0369A1 45%, #06B6D4 100%)',
    },
  },
  violet: {
    name: 'violet',
    label: 'Violet',
    brand: {
      primary: '#6D28D9',
      primaryLight: '#8B5CF6',
      primaryDark: '#4C1D95',
      secondary: '#A78BFA',
      secondaryLight: '#C4B5FD',
      secondaryDark: '#7C3AED',
      accent: '#C4B5FD',
      accent2: '#059669',
      success: '#059669',
      gradient: 'linear-gradient(90deg, #1E1B4B 0%, #6D28D9 50%, #A78BFA 100%)',
    },
  },
  ember: {
    name: 'ember',
    label: 'Ember',
    brand: {
      primary: '#C2410C',
      primaryLight: '#EA580C',
      primaryDark: '#9A3412',
      secondary: '#F59E0B',
      secondaryLight: '#FBBF24',
      secondaryDark: '#D97706',
      accent: '#FBBF24',
      accent2: '#0D9488',
      success: '#0D9488',
      gradient: 'linear-gradient(90deg, #431407 0%, #C2410C 50%, #F59E0B 100%)',
    },
  },
  forest: {
    name: 'forest',
    label: 'Forest',
    brand: {
      primary: '#166534',
      primaryLight: '#16A34A',
      primaryDark: '#14532D',
      secondary: '#84CC16',
      secondaryLight: '#A3E635',
      secondaryDark: '#65A30D',
      accent: '#A3E635',
      accent2: '#0D9488',
      success: '#0D9488',
      gradient: 'linear-gradient(90deg, #052E16 0%, #166534 50%, #84CC16 100%)',
    },
  },
};

export const DEFAULT_THEME = 'angisoft';
const THEME_STORAGE_KEY = 'angisoft-theme-name';

export function getThemeName(): string {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
  return saved && themes[saved] ? saved : DEFAULT_THEME;
}

/** Resolve the active brand palette for a mode + theme name. */
export function getThemeBrand(mode: ThemeMode, themeName: string = getThemeName()): ThemeBrand {
  return themes[themeName]?.brand ?? themes[DEFAULT_THEME].brand;
}

/** Write every token as a CSS custom property on :root and set data-theme. */
export function applyCssVariables(mode: ThemeMode = 'dark', themeName: string = getThemeName()): void {
  const root = document.documentElement;
  const surf = themeSurfaces[mode];
  const brand = getThemeBrand(mode, themeName);

  const flat = {
    '--color-primary': brand.primary,
    '--color-primary-light': brand.primaryLight,
    '--color-primary-dark': brand.primaryDark,
    '--color-secondary': brand.secondary,
    '--color-secondary-light': brand.secondaryLight,
    '--color-secondary-dark': brand.secondaryDark,
    '--color-accent': brand.accent,
    '--color-accent-2': brand.accent2,
    '--color-cyan-bright': brand.secondaryLight,
    '--color-royal-blue': brand.primaryDark,
    '--color-indigo': brand.primaryDark,
    '--color-blue-bright': brand.primary,
    '--color-green': brand.accent2,
    '--color-abyss': colors.abyss,
    '--color-tint-pale': colors.tintPale,
    '--color-tint-mist': colors.tintMist,
    '--color-white': colors.white,
    '--color-success': brand.success,
    '--gradient-footer-wave': brandGradients.footerWave,
    '--gradient-brand-sweep': brand.gradient,
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

    '--gradient-primary': brand.primary,
    '--gradient-secondary': brand.secondary,
    '--gradient-brand': brand.primary,
    '--surface-raised': mode === 'dark' ? colors.navyLighter : '#FFFFFF',
    '--shadow-color': mode === 'dark' ? '0 0 0' : '7 20 43',
    '--focus-ring': 'rgba(8, 117, 255, 0.32)',
    '--section-y': 'clamp(2.75rem, 4vw, 4.5rem)',

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
  root.setAttribute('data-theme-name', themeName);
}

/** Toggle the document-level `.dark` class and re-apply CSS vars. */
export function setThemeMode(mode: ThemeMode, themeName?: string): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  applyCssVariables(mode, themeName);
}

export function getThemeMode(): ThemeMode {
  const saved = localStorage.getItem('angisoft-theme-mode');
  if (saved === 'light' || saved === 'dark') return saved;
  // No stored choice → follow the device/OS preference.
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}
