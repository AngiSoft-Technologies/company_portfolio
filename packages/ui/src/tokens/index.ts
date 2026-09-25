/**
 * AngiSoft Design Tokens — the single source of truth for brand values.
 *
 * These replace the brand definitions that previously lived in FOUR places
 * (ThemeContext, tailwind.config.js, :root in index.css, utils/constants.js).
 * Both apps + packages/config consume THIS module only.
 */

export const brand = {
  name: 'AngiSoft Technologies',
  motto: 'Innovate • Build • Empower',
} as const;

export const colors = {
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
  navy: '#07142B',
  navyLight: '#0B1E3D',
  navyLighter: '#102A55',
  offWhite: '#F5F7FA',
} as const;

/** One accent family per view; neutral/light surfaces everywhere else. */
export const semantic = {
  text: {
    dark: colors.navy,
    light: colors.offWhite,
    mutedDark: '#334155',
    mutedLight: '#94A3B8',
  },
  surface: {
    dark: colors.navyLight,
    darkHover: colors.navyLighter,
    light: '#FFFFFF',
    lightMuted: colors.offWhite,
  },
  border: {
    dark: 'rgba(0, 175, 255, 0.22)',
    light: 'rgba(15, 23, 42, 0.1)',
  },
} as const;

export const typography = {
  fontFamily: {
    display: "'Sora', 'DM Sans', sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
  size: {
    display: 'clamp(2.5rem, 5vw, 4rem)',
    h1: 'clamp(2rem, 4vw, 3rem)',
    h2: 'clamp(1.5rem, 3vw, 2.25rem)',
    h3: '1.5rem',
    h4: '1.25rem',
    h5: '1.125rem',
    body: '1rem',
    caption: '0.875rem',
    small: '0.75rem',
  },
  lineHeight: {
    display: '1.1',
    heading: '1.15',
    body: '1.65',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  24: '6rem',
  32: '8rem',
  48: '12rem',
  64: '16rem',
  96: '24rem',
} as const;

export const radius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px',
} as const;

export const elevation = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  glow: '0 0 24px rgba(24, 216, 255, 0.35)',
} as const;

export const motion = {
  duration: {
    instant: '100ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
  secondary: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.success} 100%)`,
  brand: `linear-gradient(135deg, #18D8FF 0%, ${colors.primary} 45%, ${colors.primaryDark} 100%)`,
} as const;

export type AngiSoftColors = typeof colors;
export type AngiSoftTokens = {
  colors: typeof colors;
  semantic: typeof semantic;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
  gradients: typeof gradients;
};

export const tokens: AngiSoftTokens = {
  colors,
  semantic,
  typography,
  spacing,
  radius,
  elevation,
  motion,
  gradients,
};

export default tokens;