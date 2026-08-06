import { useEffect } from 'react';

/**
 * Focus the editor input on mount. When editing started because the user
 * typed a printable character over a focused cell (`seedTyped`), the caret
 * is left at the end (the typed character stands as the whole new value);
 * otherwise the previous value is selected so the next keystroke replaces
 * it, matching Excel/Sheets "press Enter/F2 to edit" behaviour.
 */
export function useAutoFocusSelect(
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>,
  seedTyped: boolean,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (!seedTyped && 'select' in el && typeof el.select === 'function') {
      el.select();
    } else if ('setSelectionRange' in el && typeof el.setSelectionRange === 'function') {
      const len = 'value' in el ? String(el.value).length : 0;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // Some input types (e.g. number, date) don't support setSelectionRange — ignore.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
