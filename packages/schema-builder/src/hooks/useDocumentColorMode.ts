/**
 * Which colour mode the host document is in, tracked live.
 *
 * WHY THIS EXISTS AT ALL
 *
 * `<ReactFlow>` was never given a `colorMode`. React Flow defaults it to
 * 'light', so `.react-flow` never received the `dark` class, and the library
 * stylesheet only defines its colours under `.react-flow` and `.react-flow.dark`.
 * One omission produced four separate visible defects: a pure-white MiniMap in
 * dark theme (banned in every role, and a V-C1 gate failure), the 1.33:1
 * attribution link, unthemed `<Controls>` buttons, and the "unstyled grey
 * rectangle" in the operator's report.
 *
 * WHY IT READS THE DOM INSTEAD OF IMPORTING THE THEME
 *
 * This package is consumed by crm7, BSU, conduit and throughput and deliberately
 * depends on no design system — that rule is sound and is not being broken for
 * this. The host stamps its own signal; we read it.
 *
 * WHY `data-theme` IS PREFERRED OVER THE `dark` CLASS
 *
 * @bsuite/theme's ThemeProvider sets BOTH, and its own source documents why:
 * Tailwind here is configured `darkMode: ['class', '[data-theme="dark"]']`,
 * where the custom selector REPLACES `.dark`, so every `dark:` utility keys on
 * the attribute. The estate has previously shipped `class="light"` alongside
 * `data-theme="dark"` and had every `dark:` utility apply in light mode. When
 * the two disagree, the attribute is what the rest of the page obeyed, so it is
 * what the canvas must obey too — otherwise the minimap would be the one thing
 * on screen honouring the loser.
 *
 * Falls back to the class, then to the OS preference, so a host that sets
 * neither still gets a sensible answer rather than a hardcoded 'light'.
 */
import { useEffect, useState } from 'react';

export type DocumentColorMode = 'light' | 'dark';

function readColorMode(): DocumentColorMode {
  if (typeof document === 'undefined') return 'dark';
  const root = document.documentElement;

  const attr = root.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;

  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'dark';
}

export function useDocumentColorMode(): DocumentColorMode {
  const [mode, setMode] = useState<DocumentColorMode>(readColorMode);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // The user can toggle the theme while the canvas is mounted. Without this
    // the minimap keeps whichever mode happened to be active at mount, which
    // looks exactly like the bug this hook was written to fix.
    const sync = () => {
      setMode((prev) => {
        const next = readColorMode();
        return prev === next ? prev : next;
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    mq?.addEventListener('change', sync);

    // The attribute may land between first render and effect commit.
    sync();

    return () => {
      observer.disconnect();
      mq?.removeEventListener('change', sync);
    };
  }, []);

  return mode;
}
