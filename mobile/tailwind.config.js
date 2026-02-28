/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        accent: {
          DEFAULT: '#00cec9',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#00cec9',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        background: '#0a0e1a',
        surface: '#141828',
        'surface-elevated': '#1c2137',
        foreground: '#fefefe',
        muted: {
          DEFAULT: '#6b7280',
          foreground: '#9ca3af',
        },
        destructive: {
          DEFAULT: '#ff4757',
          foreground: '#fefefe',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#fefefe',
        },
        warning: {
          DEFAULT: '#fdcb6e',
          foreground: '#0a0e1a',
        },
        border: '#1e2436',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
