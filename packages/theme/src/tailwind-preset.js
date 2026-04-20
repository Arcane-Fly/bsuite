/**
 * @bsuite/theme — Tailwind v3 preset
 *
 * Consume via:
 *   // tailwind.config.js (CommonJS)
 *   module.exports = {
 *     presets: [require('@bsuite/theme/tailwind-preset')],
 *     content: ['./src/**\/*.{js,ts,jsx,tsx}'],
 *   }
 *
 * Extends Tailwind's theme with the D2C Neon Electric palette, light/dark
 * surface tokens, semantic status colours, gradients, glow shadows, and
 * the six canonical animations. Does not override Tailwind's default scale.
 *
 * The `rgb(var(--*-rgb) / <alpha-value>)` pattern makes Tailwind alpha-value
 * modifiers work (e.g. `bg-neon-electric-blue/40`). Requires the companion
 * CSS vars to be loaded via `@import '@bsuite/theme/css'`.
 *
 * NOTE: Tailwind v4 apps should import `@bsuite/theme/preset-v4.css` instead.
 * v4 removed the preset system — presets exist only for v3.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        neon: {
          'electric-blue': 'rgb(var(--neon-electric-blue-rgb) / <alpha-value>)',
          'electric-cyan': 'rgb(var(--neon-electric-cyan-rgb) / <alpha-value>)',
          'electric-indigo': 'rgb(var(--neon-electric-indigo-rgb) / <alpha-value>)',
          'electric-purple': 'rgb(var(--neon-electric-purple-rgb) / <alpha-value>)',
          'electric-magenta': 'rgb(var(--neon-electric-magenta-rgb) / <alpha-value>)',
          'electric-pink': 'rgb(var(--neon-electric-pink-rgb) / <alpha-value>)',
          'electric-coral': 'rgb(var(--neon-electric-coral-rgb) / <alpha-value>)',
          'electric-orange': 'rgb(var(--neon-electric-orange-rgb) / <alpha-value>)',
          'electric-yellow': 'rgb(var(--neon-electric-yellow-rgb) / <alpha-value>)',
          'electric-green': 'rgb(var(--neon-electric-green-rgb) / <alpha-value>)',
          'electric-lavender': 'rgb(var(--neon-electric-lavender-rgb) / <alpha-value>)',
        },
        light: {
          bg: {
            primary: 'var(--light-bg-primary)',
            secondary: 'var(--light-bg-secondary)',
            tertiary: 'var(--light-bg-tertiary)',
            accent: 'var(--light-bg-accent)',
          },
          text: {
            primary: 'var(--light-text-primary)',
            secondary: 'var(--light-text-secondary)',
            tertiary: 'var(--light-text-tertiary)',
            quaternary: 'var(--light-text-quaternary)',
          },
          border: 'var(--light-border)',
          hover: 'var(--light-hover)',
        },
        dark: {
          bg: {
            primary: 'var(--dark-bg-primary)',
            secondary: 'var(--dark-bg-secondary)',
            tertiary: 'var(--dark-bg-tertiary)',
            quaternary: 'var(--dark-bg-quaternary)',
            accent: 'var(--dark-bg-accent)',
          },
          text: {
            primary: 'var(--dark-text-primary)',
            secondary: 'var(--dark-text-secondary)',
            tertiary: 'var(--dark-text-tertiary)',
            quaternary: 'var(--dark-text-quaternary)',
          },
          border: 'var(--dark-border)',
          hover: 'var(--dark-hover)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          error: 'var(--status-error)',
          info: 'var(--status-info)',
        },
      },

      backgroundImage: {
        'gradient-brand':
          'linear-gradient(135deg, #ff4757 0%, #ff7675 25%, #fdcb6e 50%, #00cec9 75%, #a29bfe 100%)',
        'gradient-electric':
          'linear-gradient(135deg, #2563eb 0%, #00cec9 50%, #ec4899 100%)',
        'gradient-neon':
          'linear-gradient(90deg, #00cec9 0%, #6c5ce7 50%, #ff4757 100%)',
        'gradient-chat-user':
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-chat-agent':
          'linear-gradient(135deg, #2563eb 0%, #ec4899 100%)',
        'gradient-neural':
          'radial-gradient(circle at center, rgba(0, 206, 201, 0.1) 0%, transparent 50%)',
      },

      boxShadow: {
        'glow-electric-blue': '0 0 20px rgb(var(--neon-electric-blue-rgb) / var(--glow-strength))',
        'glow-electric-cyan': '0 0 20px rgb(var(--neon-electric-cyan-rgb) / var(--glow-strength))',
        'glow-electric-purple': '0 0 20px rgb(var(--neon-electric-purple-rgb) / var(--glow-strength))',
        'glow-electric-pink': '0 0 20px rgb(var(--neon-electric-pink-rgb) / var(--glow-strength))',
        'glow-electric-coral': '0 0 20px rgb(var(--neon-electric-coral-rgb) / var(--glow-strength))',
        'glow-electric-magenta': '0 0 20px rgb(var(--neon-electric-magenta-rgb) / var(--glow-strength))',
      },

      animation: {
        'pulse-soft': 'pulse-soft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        typing: 'typing 1.5s infinite',
        shimmer: 'shimmer 2s infinite',
        float: 'float 3s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
      },

      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 206, 201, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 206, 201, 0.6)' },
        },
        typing: {
          '0%, 60%': { opacity: '1' },
          '30%': { opacity: '0.4' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'neon-pulse': {
          '0%, 100%': { textShadow: '0 0 10px rgba(0, 206, 201, 0.3)' },
          '50%': { textShadow: '0 0 20px rgba(0, 206, 201, 0.8)' },
        },
      },
    },
  },
}
