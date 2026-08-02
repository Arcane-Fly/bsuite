import { THEME_STORAGE_KEY } from '../index.js'

export interface InitScriptOptions {
  /** localStorage key to read. Defaults to `THEME_STORAGE_KEY`. */
  storageKey?: string
}

/**
 * Returns a self-contained JavaScript string that — when executed before
 * your React app hydrates — applies the correct `.dark` or `.light` class
 * to `<html>` based on the user's stored preference (or their system
 * preference if they chose 'system', or 'dark' as the default).
 *
 * The returned string is produced by this package itself, not from user
 * input, so it is safe to inline in `<head>` via the framework's inline
 * script mechanism (e.g. Next.js `<Script strategy="beforeInteractive">`
 * or an HTML `<script>` tag). It has no external dependencies and uses
 * no identifiers that might collide with host-page globals (wrapped in
 * an IIFE).
 *
 * Embed it in an inline `<script>` tag in `<head>` — **before** any
 * stylesheet that uses `.dark` selectors. This is the only way to avoid
 * FOUC: any script that runs after first paint will flash the wrong theme.
 *
 * @example Next.js App Router (src/app/layout.tsx)
 *   import Script from 'next/script'
 *   import { getThemeInitScript } from '@bsuite/theme/ssr'
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en" suppressHydrationWarning>
 *         <head>
 *           <Script id="bsuite-theme-init" strategy="beforeInteractive">
 *             {getThemeInitScript()}
 *           </Script>
 *         </head>
 *         <body>{children}</body>
 *       </html>
 *     )
 *   }
 *
 * @example Vite (index.html)
 *   <!-- paste the exact output of getThemeInitScript() inline -->
 *   <script>(function(){ ... })();</script>
 */
export function getThemeInitScript(options: InitScriptOptions = {}): string {
  const key = options.storageKey ?? THEME_STORAGE_KEY
  return `(function(){try{var s=localStorage.getItem('${key}');var t=s||'dark';var r=t;if(t==='system'){r=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var c=document.documentElement.classList;if(r==='dark'){c.add('dark');c.remove('light');}else{c.add('light');c.remove('dark');}}catch(e){}})();`
}
