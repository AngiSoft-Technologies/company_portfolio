import type { Config } from 'tailwindcss';

/**
 * AngiSoft shared Tailwind preset. Single source of truth for brand colors,
 * fonts, gradients and shadows — consumed by frontend/web and frontend/admin.
 * Values mirror packages/ui/tokens (CSS variables) and the official brand.
 */
const preset: Config = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0875FF',
          light: '#3B9AFF',
          dark: '#003BCE',
        },
        secondary: {
          DEFAULT: '#00AFFF',
          light: '#18D8FF',
          dark: '#0088CC',
        },
        accent: '#18D8FF',
        success: '#27D94B',
        warning: '#F59E0B',
        error: '#EF4444',
        navy: {
          DEFAULT: '#07142B',
          light: '#0B1E3D',
          lighter: '#102A55',
        },
        brand: {
          blue: '#0875FF',
          cyan: '#00AFFF',
          green: '#27D94B',
          navy: '#07142B',
        },
        offwhite: '#F5F7FA',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"DM Sans"', 'sans-serif'],
      },
      backgroundImage: {
        'angi-gradient': 'linear-gradient(135deg, #0875FF 0%, #00AFFF 100%)',
        'angi-dark': 'linear-gradient(180deg, #07142B 0%, #0B1E3D 100%)',
      },
      boxShadow: {
        'angi-glow': '0 0 24px rgba(24, 216, 255, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
};

export default preset;