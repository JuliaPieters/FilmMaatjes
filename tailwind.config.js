/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f0f13',
          50: '#1a1a24',
          100: '#16161f',
          200: '#12121a',
          300: '#0f0f13',
          400: '#0a0a0e',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#5b21b6',
        },
        gold: '#f59e0b',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#475569',
        border: '#1e1e2e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
