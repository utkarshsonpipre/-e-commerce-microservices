/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark Premium surface palette
        ink: {
          950: '#070710',
          900: '#0b0b16',
          850: '#10101f',
          800: '#15152a',
          700: '#1d1d38',
          600: '#272747',
        },
        brand: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        accent: {
          cyan: '#22d3ee',
          pink: '#ec4899',
        },
      },
      boxShadow: {
        glow: '0 0 24px -2px rgba(139, 92, 246, 0.45)',
        'glow-lg': '0 0 60px -10px rgba(139, 92, 246, 0.55)',
        card: '0 8px 30px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%)',
        'hero-glow':
          'radial-gradient(60% 120% at 20% 0%, rgba(139,92,246,0.25) 0%, rgba(0,0,0,0) 60%), radial-gradient(50% 100% at 100% 0%, rgba(34,211,238,0.18) 0%, rgba(0,0,0,0) 55%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease forwards',
      },
    },
  },
  plugins: [],
};
