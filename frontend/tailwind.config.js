export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  theme: {
    extend: {
      colors: {
        primary: '#0875FF',
        'primary-light': '#18D8FF',
        'primary-dark': '#003BCE',

        secondary: '#00AFFF',
        'secondary-light': '#7EF7FF',
        'secondary-dark': '#008CFF',

        accent: '#8A2BE2',

        success: '#27D94B',
        'success-light': '#5DFF62',
        'success-dark': '#19C83D',

        warning: '#F59E0B',
        error: '#EF4444',
        info: '#00AFFF',

        navy: '#07142B',
        'navy-dark': '#061324',
        'navy-light': '#0B1E3D',
        'navy-lighter': '#102A55',

        'brand-blue': '#003BCE',
        'brand-electric': '#0875FF',
        'brand-cyan': '#00AFFF',
        'brand-glow': '#18D8FF',
        'brand-green': '#27D94B',
        'brand-lime': '#5DFF62',
        'brand-purple': '#8A2BE2',

        'off-white': '#F5F7FA',
        divider: '#D7E3FF',
      },

      backgroundImage: {
        'angi-gradient': 'linear-gradient(135deg, #18D8FF 0%, #0875FF 45%, #003BCE 100%)',
        'angi-dark': 'linear-gradient(180deg, #07142B 0%, #061324 100%)',
        'angi-glow': 'radial-gradient(circle at center, rgba(0,175,255,0.35), transparent 60%)',
      },

      boxShadow: {
        custom: '0 4px 12px rgba(0, 0, 0, 0.1)',
        glow: '0 0 20px rgba(8, 117, 255, 0.35)',
        'glow-cyan': '0 0 24px rgba(0, 175, 255, 0.45)',
        'glow-green': '0 0 20px rgba(39, 217, 75, 0.35)',
      },

      transitionProperty: {
        custom: 'all 0.3s ease',
      },

      fontFamily: {
        sans: [
          'DM Sans',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'Sora',
          'DM Sans',
          'sans-serif',
        ],
      },
    },
  },

  plugins: [],
};
