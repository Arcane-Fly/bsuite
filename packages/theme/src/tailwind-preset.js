/**
 * @bsuite/theme — Tailwind v3 preset (oklch edition)
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
 * Colour values are inline oklch so the preset is self-contained — no
 * dependency on any `--*-rgb` CSS custom property. Tailwind v3 injects
 * `<alpha-value>` into any valid CSS colour function, and `oklch(L C H / A)`
 * is valid CSS Color 4 syntax (supported in all evergreen browsers:
 * Chrome ≥111, Safari ≥15.4, Firefox ≥113). Keeps bg-neon-electric-blue/40
 * and friends working without the RGB-triplet variable indirection.
 *
 * Values are kept in sync with `preset-v4.css` — editing one without the
 * other will cause v3 and v4 consumers to diverge. See README.
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
          'electric-blue': 'oklch(0.546 0.215 262.9 / <alpha-value>)',
          'electric-cyan': 'oklch(0.769 0.132 191.7 / <alpha-value>)',
          'electric-indigo': 'oklch(0.511 0.23 277 / <alpha-value>)',
          'electric-purple': 'oklch(0.568 0.202 283.1 / <alpha-value>)',
          'electric-magenta': 'oklch(0.742 0.167 359.5 / <alpha-value>)',
          'electric-pink': 'oklch(0.656 0.212 354.3 / <alpha-value>)',
          'electric-coral': 'oklch(0.669 0.219 20.9 / <alpha-value>)',
          'electric-orange': 'oklch(0.728 0.168 22.5 / <alpha-value>)',
          'electric-yellow': 'oklch(0.868 0.125 81.4 / <alpha-value>)',
          'electric-green': 'oklch(0.726 0.197 145.5 / <alpha-value>)',
          'electric-lavender': 'oklch(0.749 0.115 288.4 / <alpha-value>)',
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
          'linear-gradient(135deg, oklch(0.669 0.219 20.9) 0%, oklch(0.728 0.168 22.5) 25%, oklch(0.868 0.125 81.4) 50%, oklch(0.769 0.132 191.7) 75%, oklch(0.749 0.115 288.4) 100%)',
        'gradient-electric':
          'linear-gradient(135deg, oklch(0.546 0.215 262.9) 0%, oklch(0.769 0.132 191.7) 50%, oklch(0.656 0.212 354.3) 100%)',
        'gradient-neon':
          'linear-gradient(90deg, oklch(0.769 0.132 191.7) 0%, oklch(0.568 0.202 283.1) 50%, oklch(0.669 0.219 20.9) 100%)',
        'gradient-chat-user':
          'linear-gradient(135deg, oklch(0.636 0.153 271.3) 0%, oklch(0.466 0.168 296.3) 100%)',
        'gradient-chat-agent':
          'linear-gradient(135deg, oklch(0.546 0.215 262.9) 0%, oklch(0.656 0.212 354.3) 100%)',
        'gradient-neural':
          'radial-gradient(circle at center, oklch(0.769 0.132 191.7 / 0.1) 0%, transparent 50%)',
      },

      boxShadow: {
        'glow-electric-blue': '0 0 20px oklch(0.546 0.215 262.9 / var(--glow-strength))',
        'glow-electric-cyan': '0 0 20px oklch(0.769 0.132 191.7 / var(--glow-strength))',
        'glow-electric-purple': '0 0 20px oklch(0.568 0.202 283.1 / var(--glow-strength))',
        'glow-electric-pink': '0 0 20px oklch(0.656 0.212 354.3 / var(--glow-strength))',
        'glow-electric-coral': '0 0 20px oklch(0.669 0.219 20.9 / var(--glow-strength))',
        'glow-electric-magenta': '0 0 20px oklch(0.742 0.167 359.5 / var(--glow-strength))',
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
          '0%': { boxShadow: '0 0 5px oklch(0.769 0.132 191.7 / 0.2)' },
          '100%': { boxShadow: '0 0 20px oklch(0.769 0.132 191.7 / 0.6)' },
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
          '0%, 100%': { textShadow: '0 0 10px oklch(0.769 0.132 191.7 / 0.3)' },
          '50%': { textShadow: '0 0 20px oklch(0.769 0.132 191.7 / 0.8)' },
        },
      },
    },
  },
}
