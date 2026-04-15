/**
 * @bsuite/design-tokens
 * Shared design token constants for all BSuite apps.
 *
 * CSS variables are in src/css/. Import them in your stylesheet:
 *   @import "@bsuite/design-tokens/css/all";
 *
 * JS/TS constants are here. Import selectively:
 *   import { neonElectric, space, radius } from '@bsuite/design-tokens';
 */

export {
  // Palette
  neonElectric,
  neonElectricRgb,
  neonRgba,
  type NeonElectricColor,

  // Spacing
  space,
  type SpaceKey,

  // Radius
  radius,
  type RadiusKey,

  // Typography
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,

  // Motion
  duration,
  easing,

  // Status
  statusLight,
  statusDark,

  // App accents
  appAccents,
  type AppName,
} from './tokens.js';
