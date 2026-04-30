/**
 * Trigger a browser download for a Blob.
 *
 * Replaces the `file-saver` dependency (unmaintained since 2020, known Safari
 * issues) with a 10-line native implementation that works in all modern
 * evergreen browsers. Equivalent to the pattern already used in BSU's
 * `analyticsService.exportToCsv`.
 *
 * Throws synchronously when called outside a browser environment — callers
 * running server-side should use `toCsv` / `toXlsx` directly and handle the
 * Blob/Uint8Array themselves.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') {
    throw new Error('@bsuite/data-export/browser: downloadBlob requires a DOM');
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revoke so the browser has time to kick off the download in older
  // WebKit. 0 ms is sufficient; 100 ms is defensive.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
