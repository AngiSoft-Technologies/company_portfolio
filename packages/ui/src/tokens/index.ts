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

/**
 * Official AngiSoft palette.
 *
 * Sourced from the brand assets themselves, not hand-picked:
 *   - logo-symbol.svg                          -> #0077F1, #00A4F6, #02CCFC, #00156A
 *   - AngiSoft_Dark_Background_Logo-removebg   -> #02CCFC, #00156A, white wordmark
 *   - AngiSoftFooterWave.tsx                   -> #061324, #071C70, #123DFF, #00AFFF, #24B947
 *
 * The system is one hue ramp (electric blue -> azure -> cyan) over an abyssal
 * navy base, with a single green accent. Nothing else is a brand colour.
 */
export const colors = {
  // Blue ramp
  primary: '#0875FF',        // logo #0077F1
  primaryLight: '#3B9AFF',
  primaryDark: '#003BCE',
  royalBlue: '#00156A',      // logo — deepest blue in the mark
  indigo: '#071C70',         // footer wave gradient
  blueBright: '#123DFF',     // footer wave gradient

  // Cyan / azure ramp
  secondary: '#00AFFF',      // logo #00A4F6 + footer wave
  cyanBright: '#02CCFC',     // logo — brightest cyan in the mark
  secondaryLight: '#18D8FF',
  secondaryDark: '#0088CC',
  accent: '#18D8FF',

  // Accent green (footer wave crest only)
  green: '#24B947',
  success: '#27D94B',
  successDark: '#1EB83D',

  // Navy base
  abyss: '#061324',          // footer wave body + gradient end
  navy: '#07142B',
  navyLight: '#0B1E3D',
  navyLighter: '#102A55',

  // Neutrals
  offWhite: '#F5F7FA',
  white: '#FFFFFF',
  tintPale: '#DDEFFF',
  tintMist: '#CCE2FA',

  // Status
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

/** The footer wave is a brand asset, so its stops live beside the palette. */
export const brandGradients = {
  footerWave:
    'linear-gradient(90deg, #061324 0%, #071C70 28%, #123DFF 52%, #00AFFF 78%, #061324 100%)',
  brandSweep:
    'linear-gradient(90deg, #00156A 0%, #0875FF 38%, #00AFFF 70%, #02CCFC 100%)',
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
    dark: 'rgba(148, 163, 184, 0.18)',
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

export type AngiSoftColors = typeof colors;
export type AngiSoftTokens = {
  colors: typeof colors;
  brandGradients: typeof brandGradients;
  semantic: typeof semantic;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
};

export const tokens: AngiSoftTokens = {
  colors,
  brandGradients,
  semantic,
  typography,
  spacing,
  radius,
  elevation,
  motion,
};

export default tokens;