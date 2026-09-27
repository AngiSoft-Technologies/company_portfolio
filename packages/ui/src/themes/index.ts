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
    '--color-cyan-bright': colors.cyanBright,
    '--color-royal-blue': colors.royalBlue,
    '--color-indigo': colors.indigo,
    '--color-blue-bright': colors.blueBright,
    '--color-green': colors.green,
    '--color-abyss': colors.abyss,
    '--color-tint-pale': colors.tintPale,
    '--color-tint-mist': colors.tintMist,
    '--color-white': colors.white,
    '--color-success': colors.success,
    '--gradient-footer-wave': brandGradients.footerWave,
    '--gradient-brand-sweep': brandGradients.brandSweep,
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

    '--gradient-primary': colors.primary,
    '--gradient-secondary': colors.secondary,
    '--gradient-brand': colors.primary,
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