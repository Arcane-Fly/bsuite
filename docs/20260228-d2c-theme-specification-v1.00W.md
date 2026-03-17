# 🎨 Universal D2C Theme System 2025

This is the canonical design-system reference for the D2C BSuite web apps:

- `business-suite-unified`
- `crm7`
- `conduit`
- `R80.3`

These projects use the **D2C Neon Electric** palette and the evolving **Balanced Hybrid** surface treatment:

- semantic color tokens
- elevated shell surfaces
- restrained glow
- rounded hero and panel chrome
- premium dark mode with deep navy backgrounds

`braden.com.au` is **not** part of this theme system. Braden is undergoing its own UI refresh, but it keeps the corporate Braden brand palette and should not inherit Neon Electric colors or glow styling.

## Scope and Brand Boundaries

- Use this document for the four D2C BSuite apps only.
- Treat CRM7 as the proving ground for Balanced Hybrid shell and page-surface patterns.
- Propagate proven D2C patterns to BSU, Conduit, and R80.3 through semantic tokens, not raw hex colors.
- Do not apply Braden corporate red/gold branding to D2C apps.
- Do not apply Neon Electric gradients, cyan glow, or D2C shell treatments to Braden.

## Complete Theme Package

This document contains:

1. **Tailwind Configuration** (tailwind.config.ts)
2. **Global CSS/Theme Variables** (globals.css)
3. **Theme Provider Component** (ThemeProvider.tsx)
4. **Usage Guide**

---

## 📊 Color Palette Reference

### Neon Electric Colors (Complete Spectrum)

| Color | Hex | CSS Variable | Use Case |
|-------|-----|--------------|----------|
| Electric Blue | #2563eb | --neon-electric-blue | Primary actions, highlights |
| Electric Cyan | #00cec9 | --neon-cyan | Accents, borders |
| Electric Indigo | #4f46e5 | --neon-indigo | Secondary actions |
| Electric Purple | #6c5ce7 | --neon-purple | Gradients, effects |
| Electric Magenta | #fd79a8 | --neon-magenta | Interactive elements |
| Electric Pink | #ec4899 | --neon-pink | Hover states |
| Electric Coral | #ff4757 | --neon-coral | Alerts, destructive |
| Electric Orange | #ff7675 | --neon-orange | Warnings |
| Electric Yellow | #fdcb6e | --neon-yellow | Info, secondary alerts |
| Electric Green | #22c55e | --neon-green | Success states |
| Electric Lavender | #a29bfe | --neon-lavender | Subtle accents |

### Brand Gradient

```
Linear: #ff4757 → #ff7675 → #fdcb6e → #00cec9 → #a29bfe
(Coral → Orange → Yellow → Cyan → Lavender)
```

---

## Color Space: OKLCH

OKLCH is a perceptually uniform color space that produces smoother gradients and more accurate contrast ratios than sRGB/hex. Conduit (Tailwind v4) uses `@theme` blocks with OKLCH values directly. Vite-based projects (CRM7, BSU, R80.3) continue to use hex CSS vars at runtime — the OKLCH values below are the canonical equivalents for reference and for any future migration.

> **Note:** Values are approximate. Verify at [oklch.com](https://oklch.com) before use in production.

### Neon Electric Colors — OKLCH Equivalents

| Color | Hex | OKLCH |
|-------|-----|-------|
| Electric Blue | `#2563eb` | `oklch(0.45 0.22 264)` |
| Electric Cyan | `#00cec9` | `oklch(0.74 0.14 184)` |
| Electric Indigo | `#4f46e5` | `oklch(0.46 0.26 268)` |
| Electric Purple | `#6c5ce7` | `oklch(0.53 0.24 271)` |
| Electric Magenta | `#fd79a8` | `oklch(0.73 0.20 355)` |
| Electric Pink | `#ec4899` | `oklch(0.58 0.24 350)` |
| Electric Coral | `#ff4757` | `oklch(0.60 0.22 18)` |
| Electric Orange | `#ff7675` | `oklch(0.69 0.17 22)` |
| Electric Yellow | `#fdcb6e` | `oklch(0.86 0.14 79)` |
| Electric Green | `#22c55e` | `oklch(0.70 0.20 142)` |
| Electric Lavender | `#a29bfe` | `oklch(0.72 0.18 275)` |

### Surface Colors — OKLCH Equivalents

| Color | Hex | OKLCH | Use |
|-------|-----|-------|-----|
| Dark navy bg | `#0a0e1a` | `oklch(0.13 0.02 260)` | Dark mode background |
| Dark secondary | `#1a1f2e` | `oklch(0.19 0.02 260)` | Dark mode cards |
| Light bg | `#f2f2f2` | `oklch(0.96 0 0)` | Light mode background |

### Conduit @theme usage (Tailwind v4)

```css
@theme {
  --color-neon-electric-blue:    oklch(0.45 0.22 264);
  --color-neon-electric-cyan:    oklch(0.74 0.14 184);
  --color-neon-electric-indigo:  oklch(0.46 0.26 268);
  --color-neon-electric-purple:  oklch(0.53 0.24 271);
  --color-neon-electric-magenta: oklch(0.73 0.20 355);
  --color-neon-electric-pink:    oklch(0.58 0.24 350);
  --color-neon-electric-coral:   oklch(0.60 0.22 18);
  --color-neon-electric-orange:  oklch(0.69 0.17 22);
  --color-neon-electric-yellow:  oklch(0.86 0.14 79);
  --color-neon-electric-green:   oklch(0.70 0.20 142);
  --color-neon-electric-lavender: oklch(0.72 0.18 275);
}
```

### Vite projects CSS var usage (CRM7, BSU, R80.3)

```css
:root {
  --neon-electric-blue: 37 99 235;    /* RGB channels for Tailwind opacity support */
  --neon-electric-cyan: 0 206 201;
  /* ... */
}
```

Tailwind config maps these as: `'neon-electric-blue': 'rgb(var(--neon-electric-blue) / <alpha-value>)'`

---

## 1️⃣ TAILWIND CONFIGURATION

**File: `tailwind.config.ts`**

```typescript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============================================
        // NEON ELECTRIC COLORS - Primary Palette
        // ============================================
        neon: {
          'electric-blue': '#2563eb',   // Primary, actions
          'electric-cyan': '#00cec9',    // Accents, borders
          'electric-indigo': '#4f46e5',  // Secondary actions
          'electric-purple': '#6c5ce7',  // Gradients, effects
          'electric-magenta': '#fd79a8', // Interactive
          'electric-pink': '#ec4899',    // Hover states
          'electric-coral': '#ff4757',   // Alerts, destructive
          'electric-orange': '#ff7675',  // Warnings
          'electric-yellow': '#fdcb6e',  // Info, secondary alerts
          'electric-green': '#22c55e',   // Success
          'electric-lavender': '#a29bfe', // Subtle accents
        },

        // ============================================
        // LIGHT THEME
        // ============================================
        light: {
          bg: {
            primary: '#f2f2f2',      // Off-white
            secondary: '#f8f9fa',    // Warm gray
            tertiary: '#f1f3f4',     // Slightly darker
            quaternary: '#e9ecef',   // Subtle depth
            accent: '#ffffff',       // Cards, dialogs
          },
          text: {
            primary: '#2d3436',      // Dark charcoal
            secondary: '#636e72',    // Medium gray
            tertiary: '#74b9ff',     // Muted
            quaternary: '#a4afb7',   // Very muted
          },
          border: '#e9ecef',         // Subtle lines
          hover: '#f1f3f4',          // Hover state
        },

        // ============================================
        // DARK THEME - Deep Navy with Neon Accents
        // ============================================
        dark: {
          bg: {
            primary: '#0a0e1a',      // Very dark navy
            secondary: '#1a1f2e',    // Slightly lighter
            tertiary: '#2c3447',     // Medium navy
            quaternary: '#3c4558',   // Hover depth
            accent: '#252b3d',       // Cards, dialogs
          },
          text: {
            primary: '#f8f9fa',      // Pure white
            secondary: '#adb5bd',    // Light gray
            tertiary: '#6c757d',     // Muted gray
            quaternary: '#495057',   // Very muted
          },
          border: '#495057',         // Subtle dark lines
          hover: '#3c4558',          // Hover state

          // Accent colors for dark theme
          accent: {
            primary: '#00cec9',      // Cyan highlight
            secondary: '#2563eb',    // Electric blue
            success: '#22c55e',      // Success green
            warning: '#fdcb6e',      // Warning yellow
            danger: '#ff4757',       // Danger coral
          }
        },

        // ============================================
        // SEMANTIC COLORS
        // ============================================
        status: {
          success: '#00b894',
          warning: '#fdcb6e',
          error: '#ff4757',
          info: '#00cec9',
        },

        // ============================================
        // CHAT COLORS (if applicable)
        // ============================================
        chat: {
          user: {
            light: '#667eea',        // User bubble light
            dark: '#764ba2',         // User bubble dark
          },
          agent: {
            light: '#f093fb',        // Agent bubble light
            dark: '#2563eb',         // Agent bubble dark (electric blue)
          },
          system: {
            light: '#ffeaa7',        // System light
            dark: '#fdcb6e',         // System dark
          }
        },
      },

      // ============================================
      // BACKGROUND IMAGES & GRADIENTS
      // ============================================
      backgroundImage: {
        'grid-light': 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\' fill=\'none\' stroke=\'rgb(0 0 0 / 0.02)\'%3e%3cpath d=\'M0 .5H31.5V32\'/%3e%3c/svg%3e")',
        'grid-dark': 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\' fill=\'none\' stroke=\'rgb(255 255 255 / 0.03)\'%3e%3cpath d=\'M0 .5H31.5V32\'/%3e%3c/svg%3e")',

        'gradient-brand': 'linear-gradient(135deg, #ff4757 0%, #ff7675 25%, #fdcb6e 50%, #00cec9 75%, #a29bfe 100%)',
        'gradient-electric': 'linear-gradient(135deg, #2563eb 0%, #00cec9 50%, #ec4899 100%)',
        'gradient-neon': 'linear-gradient(90deg, #00cec9 0%, #6c5ce7 50%, #ff4757 100%)',
        'gradient-chat-user': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-chat-agent': 'linear-gradient(135deg, #2563eb 0%, #ec4899 100%)',
        'gradient-neural': 'radial-gradient(circle at center, rgba(0, 206, 201, 0.1) 0%, transparent 50%)',
      },

      // ============================================
      // SHADOWS & GLOW EFFECTS
      // ============================================
      boxShadow: {
        // Light theme shadows
        'light-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'light-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'light-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',

        // Dark theme shadows
        'dark-sm': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 15px 30px rgba(0, 0, 0, 0.4)',

        // Neon glow effects
        'glow-electric-blue': '0 0 20px rgba(37, 99, 235, 0.4)',
        'glow-electric-cyan': '0 0 20px rgba(0, 206, 201, 0.4)',
        'glow-electric-purple': '0 0 20px rgba(108, 92, 231, 0.4)',
        'glow-electric-pink': '0 0 20px rgba(236, 72, 153, 0.4)',
        'glow-electric-coral': '0 0 20px rgba(255, 71, 87, 0.4)',
        'glow-electric-magenta': '0 0 20px rgba(253, 121, 168, 0.4)',

        // Chat shadows
        'chat-light': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'chat-dark': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'message-hover': '0 4px 16px rgba(0, 206, 201, 0.2)',
      },

      // ============================================
      // ANIMATIONS & KEYFRAMES
      // ============================================
      animation: {
        'pulse-soft': 'pulse-soft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'typing': 'typing 1.5s infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
      },

      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(0, 206, 201, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 206, 201, 0.6)' },
        },
        'typing': {
          '0%, 60%': { opacity: '1' },
          '30%': { opacity: '0.4' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'neon-pulse': {
          '0%, 100%': { textShadow: '0 0 10px rgba(0, 206, 201, 0.3)' },
          '50%': { textShadow: '0 0 20px rgba(0, 206, 201, 0.8)' },
        },
      },

      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
      },
    },
  },
  plugins: [],
}
```

---

## 2️⃣ GLOBAL CSS WITH THEME VARIABLES

**File: `src/globals.css`**

```css
/* ============================================
   THEME SYSTEM - CSS CUSTOM PROPERTIES
   ============================================ */

@layer base {
  :root {
    /* Neon Electric Colors */
    --neon-electric-blue: 37 99 235;       /* #2563eb */
    --neon-electric-cyan: 0 206 201;       /* #00cec9 */
    --neon-electric-indigo: 79 70 229;     /* #4f46e5 */
    --neon-electric-purple: 108 92 231;    /* #6c5ce7 */
    --neon-electric-magenta: 253 121 168;  /* #fd79a8 */
    --neon-electric-pink: 236 72 153;      /* #ec4899 */
    --neon-electric-coral: 255 71 87;      /* #ff4757 */
    --neon-electric-orange: 255 118 117;   /* #ff7675 */
    --neon-electric-yellow: 253 203 110;   /* #fdcb6e */
    --neon-electric-green: 34 197 94;      /* #22c55e */
    --neon-electric-lavender: 162 155 254; /* #a29bfe */

    /* Light Theme */
    --light-bg-primary: 254 254 254;   /* #f2f2f2 */
    --light-bg-secondary: 248 249 250; /* #f8f9fa */
    --light-bg-tertiary: 241 243 244;  /* #f1f3f4 */
    --light-text-primary: 45 52 54;    /* #2d3436 */
    --light-text-secondary: 99 110 114;/* #636e72 */
    --light-border: 233 236 239;       /* #e9ecef */

    /* Dark Theme */
    --dark-bg-primary: 10 14 26;       /* #0a0e1a */
    --dark-bg-secondary: 26 31 46;     /* #1a1f2e */
    --dark-bg-tertiary: 44 52 71;      /* #2c3447 */
    --dark-text-primary: 248 249 250;  /* #f8f9fa */
    --dark-text-secondary: 173 181 189;/* #adb5bd */
    --dark-border: 73 80 87;           /* #495057 */

    /* Semantic Status Colors */
    --status-success: 0 184 148;       /* #00b894 */
    --status-warning: 253 203 110;     /* #fdcb6e */
    --status-error: 255 71 87;         /* #ff4757 */
    --status-info: 0 206 201;          /* #00cec9 */

    /* Glow/Shadow Effects */
    --glow-strength: 0.4;
    --shadow-strength: 1;
  }

  /* Dark Mode Overrides */
  .dark {
    --neon-electric-blue: 37 99 235;
    --neon-electric-cyan: 0 206 201;
    --neon-electric-purple: 108 92 231;
    --neon-electric-pink: 236 72 153;
    --neon-electric-coral: 255 71 87;
    --neon-electric-magenta: 253 121 168;
    --neon-electric-orange: 255 118 117;
    --neon-electric-yellow: 253 203 110;
    --neon-electric-green: 34 197 94;
    --neon-electric-lavender: 162 155 254;

    --glow-strength: 0.6;
    --shadow-strength: 0.8;
  }

  /* ============================================
     TAILWIND DIRECTIVES
     ============================================ */
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* ============================================
     BASE STYLES
     ============================================ */
  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-light-bg-primary text-light-text-primary transition-colors duration-300;
  }

  .dark body {
    @apply bg-dark-bg-primary text-dark-text-primary;
  }

  /* ============================================
     COLOR UTILITY SHORTCUTS
     ============================================ */
  .text-neon-electric {
    @apply text-neon-electric-blue;
  }

  .bg-neon-glow-electric {
    @apply bg-gradient-to-r from-neon-electric-blue to-neon-electric-cyan;
  }

  .border-neon {
    @apply border-neon-electric-cyan;
  }

  /* Glow effect utilities */
  .glow-electric-blue {
    box-shadow: 0 0 20px rgba(var(--neon-electric-blue), var(--glow-strength));
  }

  .glow-electric-cyan {
    box-shadow: 0 0 20px rgba(var(--neon-electric-cyan), var(--glow-strength));
  }

  .glow-electric-purple {
    box-shadow: 0 0 20px rgba(var(--neon-electric-purple), var(--glow-strength));
  }

  .glow-electric-pink {
    box-shadow: 0 0 20px rgba(var(--neon-electric-pink), var(--glow-strength));
  }

  .glow-electric-coral {
    box-shadow: 0 0 20px rgba(var(--neon-electric-coral), var(--glow-strength));
  }

  /* Neon text shadow effects */
  .neon-text-cyan {
    text-shadow: 0 0 10px rgba(0, 206, 201, 0.5),
                 0 0 20px rgba(0, 206, 201, 0.3);
  }

  .neon-text-electric {
    text-shadow: 0 0 10px rgba(37, 99, 235, 0.5),
                 0 0 20px rgba(37, 99, 235, 0.3);
  }

  /* Smooth transitions */
  .transition-theme {
    @apply transition-colors duration-300;
  }
}

/* ============================================
   COMPONENT-LEVEL STYLES
   ============================================ */

/* Form inputs */
input, textarea, select {
  @apply bg-light-bg-accent text-light-text-primary border border-light-border rounded-lg px-3 py-2 transition-theme;
  @apply focus:outline-none focus:ring-2 focus:ring-neon-electric-blue;
}

.dark input,
.dark textarea,
.dark select {
  @apply bg-dark-bg-accent text-dark-text-primary border-dark-border;
}

/* Buttons */
button {
  @apply font-medium transition-all duration-200;
}

/* Links */
a {
  @apply text-neon-electric-blue hover:text-neon-electric-cyan transition-theme;
}

/* Code blocks */
code, pre {
  @apply font-mono text-sm;
}

code {
  @apply bg-light-bg-secondary text-light-text-primary px-1.5 py-0.5 rounded;
}

.dark code {
  @apply bg-dark-bg-secondary text-dark-text-primary;
}

/* ============================================
   RESPONSIVE UTILITIES
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3️⃣ THEME PROVIDER COMPONENT

**File: `src/contexts/ThemeProvider.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    setIsClient(true);

    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = storedTheme || 'system';
    setThemeState(initialTheme);

    // Apply theme on mount
    applyTheme(initialTheme);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!isClient) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(theme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, isClient]);

  const applyTheme = (selectedTheme: Theme) => {
    const isDarkMode =
      selectedTheme === 'dark' ||
      (selectedTheme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setIsDark(isDarkMode);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

---

## 4️⃣ USAGE EXAMPLES

### In main.tsx (Apply theme BEFORE React renders)

```typescript
// ✅ CORRECT - Apply theme before React mounts
document.documentElement.className = localStorage.getItem('theme') || 'dark';

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeProvider'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

### Using theme in components

```typescript
import { useTheme } from '@/contexts/ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-2 rounded-lg transition-all ${
          theme === 'light'
            ? 'bg-neon-electric-blue text-white'
            : 'bg-light-bg-secondary text-light-text-primary'
        }`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-2 rounded-lg transition-all ${
          theme === 'dark'
            ? 'bg-neon-electric-cyan text-dark-bg-primary'
            : 'bg-light-bg-secondary text-light-text-primary'
        }`}
      >
        Dark
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`px-3 py-2 rounded-lg transition-all ${
          theme === 'system'
            ? 'bg-neon-electric-purple text-white'
            : 'bg-light-bg-secondary text-light-text-primary'
        }`}
      >
        System
      </button>
    </div>
  )
}
```

### Neon effect utilities

```typescript
// Glow text
<h1 className="text-3xl font-bold neon-text-cyan">
  Electric Header
</h1>

// Glow backgrounds
<div className="p-6 bg-gradient-brand rounded-lg glow-electric-blue">
  Content with neon glow
</div>

// Color utilities
<div className="text-neon-electric-blue hover:text-neon-electric-cyan">
  Interactive element
</div>
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Tailwind config extends with all neon colors
- [ ] globals.css has all CSS custom properties set
- [ ] ThemeProvider wraps entire app in main.tsx
- [ ] Theme applied BEFORE React renders (no FOUC)
- [ ] Light/dark mode toggles work correctly
- [ ] System preference detection works
- [ ] Theme persists across page reloads
- [ ] All 11 neon colors available in components
- [ ] Glow effects render properly in dark mode
- [ ] Gradient utilities apply correctly
- [ ] Responsive motion preferences respected
- [ ] No console warnings about theme

adapt to our projects specific setup. below is template. take this for inspiration for QA activities to tackle but dont create things if they are completely irrelevant to the codebase.

- Ensure the database functions correctly with all new implementations; confirm schema compatibility and that new features are QIG-pure.
- Verify that all required dependencies are installed, up-to-date, and managed via the correct package manager.
- Confirm 'barrel', 'dry', and internal API routes are implemented and routed through centralized, versioned constants.
- Ensure all components, kernels, and support features are correctly bridged and modular—no code duplication or orphaned modules.
- Validate that no code-generation templates were used in implementation.
- Kernels must communicate generatively, using QIG-ML/chain/graph and memory as pure modules with clear separation of concerns and stateless logic where possible.
- Remove legacy JSON memory files—ensure Redis is universally adopted for caching and session or memory storage where appropriate.
- Review and update documentation to:
  - Conform to the prescribed style guide and ISO-aligned naming conventions.
  - Ensure attached assets are consolidated into existing or new root docs, relocated into the `docs` directory as appropriate.
  - Align all moved/created documentation with the standardized style and naming structure.
- Clean up and refactor the codebase as needed for maintainability, clarity, and adherence to housekeeping best practices.
- ensure all UI components allow for user acess to all functionality. long form agentic tasks? how are they run? how are they returned to the user?

# Comprehensive Web Application Improvement Checklist

A thorough audit framework for modern web applications covering UI/UX, architecture, backend, security, testing, and deployment best practices.

---

## 🎨 **UI/UX Improvements**

### Visual Design

- **Design system consistency**: Standardize spacing, typography scales, and color tokens across all components
- **Micro-interactions**:  Add loading skeletons, hover states, and transition animations for better feedback
- **Mobile-first responsive design**:  Ensure all components adapt seamlessly from 320px to 4K displays
- **Dark mode polish**: Review all components for proper contrast ratios and accessibility in both themes
- **Empty states**: Add engaging empty state illustrations and actionable CTAs
- **Error states**: Design user-friendly error messages with recovery actions
- **Tooltip improvements**: Add contextual tooltips for complex features
- **Progressive disclosure**:  Implement collapsible sections for information-dense pages

### Navigation & Flow

- **Breadcrumb navigation**: Add breadcrumbs for deep page hierarchies
- **Quick actions menu**: Global command palette (CMD+K) for power users
- **Persistent navigation state**: Remember user's last location and scroll position
- **Skip navigation links**: Improve keyboard navigation accessibility
- **Loading states**:  Implement optimistic UI updates and skeleton screens
- **Onboarding tours**: Interactive product tours for new users
- **Contextual help**:  In-app help system with search functionality

### Performance UX

- **Optimistic updates**: Update UI immediately before API confirmation
- **Infinite scroll**: Replace pagination with infinite scroll where appropriate
- **Virtual scrolling**:  For long lists and data tables
- **Image lazy loading**:  Implement progressive image loading with blur-up
- **Perceived performance**: Add loading animations that feel faster

---

## 🏗️ **Architecture & Code Quality**

### Module Organization

- **Barrel exports**: Implement comprehensive `index.ts` files in all directories
  - `src/components/index.ts`
  - `src/hooks/index.ts`
  - `src/utils/index.ts`
  - `src/types/index.ts`
- **Feature-based structure**: Organize by feature rather than file type
- **Shared kernel**: Create `src/shared/` for truly reusable code
- **Domain boundaries**: Clear separation between business domains

### DRY Principles

- **API response handlers**: Centralize error handling and response parsing
- **Form validation**: Reusable validation schemas (Zod, Yup, etc.)
- **Data fetching patterns**: Unified data fetching wrapper (SWR/React Query/TanStack Query)
- **Component composition**: Extract common patterns (modals, drawers, card layouts)
- **Style utilities**:  Consolidate repeated CSS/Tailwind class combinations
- **Business logic extraction**: Move logic from components to service/domain layer

### Type Safety

- **Strict TypeScript**: Enable `strict: true` in tsconfig.json
- **Runtime validation**: Use schema validators for runtime type validation at boundaries
- **Generated types**: Auto-generate types from backend schema/OpenAPI specs
- **Discriminated unions**:  Use for variant types and state machines
- **Type guards**: Implement type predicates for better type narrowing
- **Generic utilities**: Create reusable generic types for common patterns

---

## 🔌 **Backend & API**

### Internal API Routes

- **API route handlers**: Create organized `/api` directory structure
  - RESTful resource endpoints
  - Computed/aggregated data endpoints
  - Health check endpoint
- **Middleware layer**: Authentication, rate limiting, validation, logging
- **Response formatting**:  Standardized JSON response structure
- **API versioning**: Version API routes for backward compatibility
- **Error codes**:  Consistent error code system
- **Request logging**: Structured logging with correlation IDs

### Database Optimization

- **Query optimization**: Review and index frequently queried fields
- **Batch operations**: Reduce N+1 queries with batch fetching
- **Caching layer**: Implement Redis/in-memory cache for hot data
- **Connection pooling**:  Optimize database connection management
- **Database migrations**:  Version control for schema changes
- **Soft deletes**: Implement soft delete pattern for user data

### Background Processing

- **Job queues**: Implement background job processing
- **Scheduled tasks**:  Cron jobs for periodic operations
- **Email/notifications**: Transactional messaging systems
- **Media processing**: Image/video processing pipelines
- **Webhook handlers**:  External service integrations

---

## 🧩 **Component Architecture**

### Component Patterns

- **Compound components**: For complex, multi-part UI components
- **Render props**: For flexible component composition
- **HOCs for cross-cutting concerns**: Authentication, analytics tracking, permissions
- **Headless UI**:  Separate logic from presentation
- **Polymorphic components**: `as` prop for flexible rendering
- **Slot pattern**: Named slots for flexible layouts

### State Management

- **Context optimization**: Split contexts by update frequency
- **State machines**: Use XState or similar for complex state flows
- **Global stores**: Zustand/Redux for app-wide state
- **Server state**:  React Query/SWR for server data
- **Form state**: React Hook Form/Formik with validation
- **URL state**: Sync filters/pagination with URL params

---

## 🔒 **Security & Performance**

### Security

- **Content Security Policy**:  Implement strict CSP headers
- **Input sanitization**:  Sanitize user-generated content
- **Rate limiting**: API endpoint rate limiting
- **CSRF protection**: Token-based CSRF prevention
- **Secret rotation**: Automated secret rotation strategy
- **Audit logging**: Track sensitive operations
- **Permission system**:  Granular role-based access control (RBAC)

### Performance

- **Code splitting**: Route-based and component-based code splitting
- **Bundle analysis**: Regular bundle size monitoring and optimization
- **Tree shaking**:  Ensure dead code elimination
- **Preloading**: Strategic resource preloading
- **Service worker**: Offline support and caching strategies
- **CDN strategy**: Static asset delivery via CDN
- **Database indexes**: Index optimization based on query patterns
- **Compression**: Brotli/Gzip for all text assets

---

## 🧪 **Testing & Quality**

### Test Coverage

- **Unit tests**: Test utilities, hooks, and pure functions
- **Component tests**: Test UI components in isolation
- **Integration tests**: Test API routes and workflows
- **E2E tests**:  Test critical user journeys (Playwright/Cypress)
- **Visual regression**:  Automated visual testing
- **Performance tests**: Lighthouse CI in pipeline
- **Accessibility tests**: Automated a11y testing (Axe-core)

### Quality Tools

- **Pre-commit hooks**: Husky + lint-staged for code quality
- **Conventional commits**: Enforce commit message format
- **Changelog automation**: Auto-generate changelogs from commits
- **Type coverage**: Track TypeScript coverage percentage
- **Code coverage**:  Maintain >80% coverage target
- **Mutation testing**: Test the quality of your tests

---

## 📊 **Analytics & Monitoring**

### Observability

- **Error tracking**: Centralized error monitoring (Sentry, Bugsnag)
- **Performance monitoring**: Web Vitals tracking (Core Web Vitals)
- **User analytics**: Product analytics platform (PostHog, Mixpanel, Amplitude)
- **Session replay**: Debug with session recordings
- **Custom events**: Track feature usage and conversions
- **A/B testing**: Feature flag system with analytics
- **Synthetic monitoring**: Uptime and performance checks

### Business Intelligence

- **Dashboard metrics**: Real-time KPI dashboard
- **Retention cohorts**: User retention and churn analysis
- **Feature adoption**: Track feature usage rates
- **Performance baselines**: Establish and monitor performance baselines
- **Cost monitoring**:  Track infrastructure and service costs

---

## 🚀 **DevOps & Deployment**

### CI/CD

- **Pipeline optimization**: Parallel jobs, dependency caching
- **Preview deployments**:  Ephemeral environments for PRs
- **Automated testing**: Run tests on every PR
- **Automated releases**: Semantic versioning and automated releases
- **Rollback strategy**: Quick rollback procedures
- **Zero-downtime deployments**: Blue-green or canary deployments
- **Feature flags**: Progressive rollout system

### Infrastructure

- **Environment parity**:  Dev/staging/prod consistency
- **Infrastructure as Code**: Terraform/Pulumi/CloudFormation
- **Secrets management**: Centralized secret management (Vault, AWS Secrets Manager)
- **Database backups**: Automated backup and restore strategy
- **Disaster recovery**: Documented recovery procedures
- **Load testing**: Regular performance and stress testing
- **Auto-scaling**: Configure horizontal scaling policies

---

## 📱 **Mobile & PWA**

### Progressive Web App

- **Service Worker**: Offline support and caching strategy
- **Install prompts**: Native app-like install experience
- **Push notifications**: Web push for user engagement
- **Background sync**: Sync data when connection restored
- **App manifest**: Proper PWA manifest configuration
- **Splash screens**: Native-like loading experience

### Mobile Optimization

- **Touch gestures**:  Swipe actions, pull-to-refresh
- **Mobile navigation**:  Optimized navigation patterns
- **Native APIs**: Camera, geolocation, vibration, etc.
- **Performance budget**:  Strict mobile performance targets
- **Responsive images**: Serve appropriate image sizes per device

---

## 🎯 **Feature Development Best Practices**

### Planning & Design

- **Feature flags**: Develop behind feature flags
- **Design mockups**: Design before implementation
- **User research**: Validate with user feedback
- **Analytics planning**: Plan tracking before building
- **Documentation**: Document features as you build

### Implementation

- **Small PRs**: Keep pull requests focused and reviewable
- **Progressive enhancement**: Build for baseline, enhance progressively
- **Graceful degradation**: Fail gracefully when features unavailable
- **Error boundaries**: Catch and handle component errors
- **Loading states**: Proper loading and skeleton states

### Iteration

- **Beta testing**: Test features with subset of users
- **Feedback loops**: Collect and act on user feedback
- **Performance monitoring**: Monitor feature performance impact
- **Usage analytics**: Track feature adoption and engagement
- **Continuous improvement**: Iterate based on data

---

## ♿ **Accessibility (a11y)**

### WCAG Compliance

- **ARIA labels**: Comprehensive ARIA implementation
- **Keyboard navigation**: Full keyboard accessibility
- **Screen reader testing**: Regular testing with screen readers
- **Focus management**:  Proper focus trapping and restoration
- **Color contrast**:  WCAG AA/AAA contrast ratios
- **Motion preferences**: Respect `prefers-reduced-motion`
- **Text scaling**: Support up to 200% text zoom
- **Alternative text**: Descriptive alt text for images

---

## 📚 **Documentation**

### Developer Documentation

- **Architecture diagrams**: Visual system architecture documentation
- **API documentation**: OpenAPI/Swagger specs for APIs
- **Component library**: Storybook or similar for component documentation
- **Contribution guide**:  Detailed contribution guidelines
- **Code examples**: Common patterns and recipes
- **Troubleshooting guide**:  Common issues and solutions
- **ADRs**: Architecture Decision Records for major decisions

### User Documentation

- **User guide**: Comprehensive feature documentation
- **Video tutorials**: Screen recordings for complex features
- **FAQ**: Searchable FAQ system
- **Release notes**: User-facing changelog
- **API docs**:  Public API documentation (if applicable)

---

## 🔄 **Migration & Refactoring**

### Code Modernization

- **Language updates**: Migrate to latest stable language versions
- **Framework updates**: Keep framework versions current
- **Type system migration**: Gradual migration to TypeScript
- **Modern patterns**:  Adopt modern patterns (hooks, composition)

### Technical Debt

- **Dependency conflicts**:  Resolve package manager conflicts
- **Environment variables**: Standardize environment configuration
- **Regular updates**: Schedule regular dependency updates
- **Dead code elimination**: Remove unused code and dependencies
- **Style consolidation**: Merge duplicate styles
- **Pattern consistency**: Standardize API and component patterns

---

## 🌐 **Internationalization (i18n)**

- **i18n framework**:  Implement internationalization library
- **Locale detection**:  Automatic user locale detection
- **RTL support**: Right-to-left language support
- **Date/number formatting**:  Locale-aware formatting
- **Translation management**: Translation workflow and tooling
- **Currency support**: Multi-currency support
- **Content translation**: CMS integration for translated content

---

## 📋 **Additional Considerations**

### Legal & Compliance

- **GDPR compliance**: Data protection and privacy compliance
- **Cookie consent**: Proper cookie consent management
- **Terms of service**: Clear terms and privacy policy
- **Data retention**: Define data retention policies
- **Right to deletion**: Implement user data deletion

### SEO & Marketing

- **Meta tags**: Proper meta tags for social sharing
- **Structured data**: Schema. org markup
- **Sitemap**: Generate and maintain sitemap. xml
- **robots.txt**: Configure search engine crawling
- **Analytics integration**: Google Analytics/alternative
- **Social sharing**: Easy social media sharing

### Business Continuity

- **Uptime monitoring**: 24/7 uptime monitoring
- **Incident response**: Documented incident response plan
- **Status page**: Public status page for service health
- **SLA tracking**: Track and report on SLAs
- **Communication plan**: User communication during incidents

---

**Usage Note**: This checklist is designed to be technology-agnostic.  Adapt sections based on your stack (React/Vue/Svelte, Node/Python/Go, SQL/NoSQL, etc.) and project requirements. Not all items apply to all projects—prioritize based on your application's needs and maturity level.
