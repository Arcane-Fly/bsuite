/**
 * Ambient module declarations for side-effect CSS imports.
 *
 * `react-grid-layout/css/styles.css` and `react-resizable/css/styles.css`
 * are shipped as raw CSS and consumed via `import 'package/css/...'` for
 * their side effects. TypeScript 6 + `moduleResolution: "bundler"` now
 * requires an explicit ambient declaration for side-effect imports of
 * non-TS modules, otherwise the compiler raises TS2882.
 *
 * The bundler (Vite / Rollup / Next) still handles the actual CSS
 * resolution at build time; this file only exists to satisfy tsc.
 */

declare module '*.css';
