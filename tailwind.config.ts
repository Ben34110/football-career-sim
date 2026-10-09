import type { Config } from 'tailwindcss';

const config: Config = {
  // hover styles only on devices that really hover: no tint stuck on the last tapped zone on phones
  future: { hoverOnlyWhenSupported: true },
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: { 300: '#6ee7b7', 400: '#34d399', 500: '#10e08a', 600: '#05b86c' },
        gold: { 200: '#fbe7a1', 300: '#f8d572', 400: '#f2c14e', 500: '#d9a42b', 600: '#b07f12' },
        crimson: { 400: '#fb4b5e', 500: '#ef2c45', 600: '#c61a33' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 24px -4px rgba(52, 211, 153, 0.55)',
        gold: '0 0 24px -4px rgba(242, 193, 78, 0.5)',
        crimson: '0 0 24px -4px rgba(239, 44, 69, 0.55)',
        gloss: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 8px 24px -12px rgba(0,0,0,0.8)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        pulseRing: 'pulseRing 1.6s ease-out infinite',
        floaty: 'floaty 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
