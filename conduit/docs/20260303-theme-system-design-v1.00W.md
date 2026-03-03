# Conduit Theme System Design

**Version:** 1.00W
**Date:** 2026-03-03
**Status:** Working
**Phase:** 8B (Retroactive)
**Applies to:** Conduit ATS

---

## Overview

Conduit implements the **D2C Neon Electric theme** shared across all BSuite consumer-facing apps (BSU, CRM7, Conduit, R80.3). The theme uses Tailwind CSS v4's `@theme` directive with OKLCH color space for perceptually uniform color transitions.

The corporate site (braden.com.au) uses a separate brand palette and is explicitly excluded from D2C theming.

---

## Architecture

### CSS Custom Properties (globals.css)

Conduit uses Tailwind CSS v4's `@theme` block to define semantic design tokens as CSS custom properties. Dark mode overrides use the `.dark` class selector (applied by `next-themes`).

| Token Category | Example Variable | Purpose |
|---------------|-----------------|---------|
| Background | `--color-background` | Page/surface backgrounds |
| Foreground | `--color-foreground` | Primary text |
| Primary | `--color-primary` | Actions, links, focus rings |
| Muted | `--color-muted` | Disabled states, subtle backgrounds |
| Destructive | `--color-destructive` | Error states, delete actions |
| Sidebar | `--color-sidebar-*` | Dashboard sidebar theming |
| Chart | `--color-chart-1..5` | Data visualization palette |
| Border Radius | `--radius-sm/md/lg/xl` | Consistent corner rounding |

### Color Space: OKLCH

All color values use the `oklch()` function for perceptual uniformity:
- **Lightness** (0–1): Perceptually accurate brightness
- **Chroma** (0–0.4): Saturation intensity
- **Hue** (0–360): Color angle

D2C primary hue is **264** (blue-indigo), matching Electric Blue `#2563eb`.

### Light Mode

| Token | OKLCH Value | Approximate Hex |
|-------|-------------|-----------------|
| Primary | `oklch(0.45 0.18 264)` | ~#2563eb |
| Background | `oklch(1 0 0)` | #ffffff |
| Foreground | `oklch(0.145 0 0)` | ~#1a1a1a |
| Sidebar | `oklch(0.98 0.005 250)` | ~#f5f7ff |

### Dark Mode

| Token | OKLCH Value | Approximate Hex |
|-------|-------------|-----------------|
| Primary | `oklch(0.6 0.2 264)` | ~#4f87ff |
| Background | `oklch(0.145 0 0)` | ~#1a1a1a |
| Foreground | `oklch(0.985 0 0)` | ~#fefefe |
| Sidebar | `oklch(0.16 0.03 260)` | ~#0f1629 |
| Sidebar Primary | `oklch(0.72 0.15 185)` | ~#00cec9 (Cyan accent) |

---

## Theme Provider

**File:** `src/components/providers/ThemeProvider.tsx`

Uses `next-themes` with `attribute="class"` strategy:
- System preference detection (`enableSystem`)
- Persistent theme via cookie (no flash of incorrect theme on SSR)
- `storageKey: "conduit-theme"` to avoid conflicts with other BSuite apps

### Theme Toggle

**File:** `src/components/common/ThemeToggle.tsx`

Provides sun/moon icon toggle in the dashboard header.

---

## Accessibility

### WCAG 2.3.1 Motion

`globals.css` includes a `prefers-reduced-motion` media query that:
- Removes all animations (`animation-duration: 0.01ms`)
- Removes transitions (`transition-duration: 0.01ms`)
- Disables smooth scrolling (`scroll-behavior: auto`)

### Color Contrast

OKLCH values are chosen to maintain WCAG 2.1 AA contrast ratios:
- Light mode: foreground on background achieves >7:1 (AAA)
- Dark mode: foreground on background achieves >7:1 (AAA)
- Primary on background: >4.5:1 (AA) in both modes

---

## D2C Theme Reference

See the master theme specification at `docs/20260228-d2c-theme-specification-v1.00W.md` for:
- Complete Neon Electric color palette (11 named colors)
- Brand gradient definition
- Tailwind configuration for Vite-based projects
- Usage patterns and component examples

---

## Files

| File | Purpose |
|------|---------|
| `src/app/globals.css` | CSS custom properties for light/dark modes |
| `src/components/providers/ThemeProvider.tsx` | next-themes provider wrapper |
| `src/components/common/ThemeToggle.tsx` | Dark/light mode toggle button |
| `tailwind.config.ts` | Tailwind CSS v4 configuration |
