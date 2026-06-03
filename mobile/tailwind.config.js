/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'oklch(0.546 0.215 262.9)',
          50: 'oklch(0.97 0.014 254.6)',
          100: 'oklch(0.932 0.032 255.6)',
          200: 'oklch(0.882 0.059 254.1)',
          300: 'oklch(0.809 0.105 251.8)',
          400: 'oklch(0.707 0.165 254.6)',
          500: 'oklch(0.546 0.215 262.9)',
          600: 'oklch(0.488 0.243 264.4)',
          700: 'oklch(0.424 0.199 265.6)',
          800: 'oklch(0.379 0.146 265.5)',
          900: 'oklch(0.282 0.091 267.9)',
        },
        accent: {
          DEFAULT: 'oklch(0.769 0.132 191.7)',
          50: 'oklch(0.984 0.019 200.9)',
          100: 'oklch(0.956 0.045 203.4)',
          200: 'oklch(0.917 0.08 205)',
          300: 'oklch(0.86 0.099 196)',
          400: 'oklch(0.789 0.154 191.8)',
          500: 'oklch(0.769 0.132 191.7)',
          600: 'oklch(0.609 0.126 221.7)',
          700: 'oklch(0.52 0.105 223.1)',
          800: 'oklch(0.45 0.085 224.3)',
          900: 'oklch(0.398 0.07 227.4)',
        },
        background: 'oklch(0.13 0.02 260)',
        surface: 'oklch(0.17 0.025 260)',
        'surface-elevated': 'oklch(0.21 0.03 260)',
        foreground: 'oklch(0.955 0 0)',
        muted: {
          DEFAULT: 'oklch(0.551 0.027 264.4)',
          foreground: 'oklch(0.713 0.019 261.3)',
        },
        destructive: {
          DEFAULT: 'oklch(0.568 0.202 283.1)',
          foreground: 'oklch(0.955 0 0)',
        },
        success: {
          DEFAULT: 'oklch(0.723 0.192 149.6)',
          foreground: 'oklch(0.955 0 0)',
        },
        warning: {
          DEFAULT: 'oklch(0.868 0.125 81.4)',
          foreground: 'oklch(0.13 0.02 260)',
        },
        border: 'oklch(0.21 0.03 260)',
      },
      fontFamily: {
        sans: ['Inter'],
        mono: ['SpaceMono'],
      },
    },
  },
  plugins: [],
};
