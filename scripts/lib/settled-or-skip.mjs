/**
 * THE ROUTE-GATE GUARD — "did the page ever actually render?"
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * audit-legibility.mjs and audit-ui-pages.mjs already refuse to measure two
 * pages that are not the page you asked for: an off-origin OAuth server, and a
 * same-origin bounce to /login. Both were learned from false findings.
 *
 * There is a THIRD, and it is the one that produces false PASSES rather than
 * false findings, which is strictly worse. crm7's <ProtectedRoute> renders a
 * full-viewport spinner reading "Checking access for Contacts..." while the
 * session and the permission set resolve. It is same-origin, it is not /login,
 * its <title> is "Contacts | CRM7", and it is a legal, legible, accessible
 * page. Every check in both audits passes on it.
 *
 * Measured live on d.crm.crm7.app, 2026-08-18, with a real minted session
 * (scripts/theme-session.sh), 6s settle:
 *
 *   /dashboard  title "Dashboard | CRM7"  only heading: "Checking access for Dashboard..."
 *   /contacts   title "Contacts | CRM7"   only heading: "Checking access for Contacts..."
 *   /clients    title "Clients | CRM7"    only heading: "Checking access for Clients..."
 *
 * audit-legibility reported "✓ /dashboard ✓ /contacts ✓ /clients — 0 finding(s)"
 * and audit-ui-pages reported "1 clean" on /contacts. Three green ticks over a
 * spinner. That is exactly the shape the SIGNED-IN sweep was built to remove —
 * a route nobody looked at, reported as a route that passed.
 *
 * WHAT IT DOES
 * A skip is not a pass, and audit-routes.sh already FAILS the job when an
 * AUTHENTICATED route is skipped. So the correct outcome is SKIPPED, not
 * "clean". This helper waits, bounded, for the gate to clear — a slow page must
 * not be reported as unaudited — and only calls it unsettled if it never does.
 *
 * WHY TWO SIGNALS
 * `[data-testid="auth-loading-spinner"]` is crm7's own marker on that element
 * (src/components/auth/protected-route.tsx) — named, not guessed. It does not
 * exist in the other five apps, so the second signal is generic: a `role=status`
 * live region whose own text begins with a loading verb AND which fills at
 * least half the viewport. A small inline "Loading…" next to a table is not a
 * gate; a full-height one is the page.
 */

/** Selector for crm7's named gate marker. Extend the list, never widen it. */
export const GATE_TESTIDS = ['auth-loading-spinner'];

/** Text a full-viewport live region shows while a route is still resolving. */
export const GATE_TEXT = /^\s*(loading|checking access|redirecting|signing in|please wait)\b/i;

/**
 * Is the page still showing a route gate rather than the route?
 * Runs in the browser; returns a short reason string, or null when settled.
 */
export async function gateReason(page) {
  return page.evaluate(
    ([testids, textSrc]) => {
      const re = new RegExp(textSrc, 'i');
      for (const id of testids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (el && el.getClientRects().length) {
          const h = el.querySelector('h1, h2, h3');
          return `route gate still showing: [data-testid="${id}"]${h ? ` — "${h.textContent.trim().slice(0, 60)}"` : ''}`;
        }
      }
      for (const el of document.querySelectorAll('[role="status"]')) {
        if (!el.getClientRects().length) continue;
        const box = el.getBoundingClientRect();
        if (box.height < window.innerHeight * 0.5) continue;
        const text = (el.innerText || '').trim();
        if (re.test(text)) {
          return `route gate still showing: full-viewport role=status — "${text.replace(/\s+/g, ' ').slice(0, 60)}"`;
        }
      }
      return null;
    },
    [GATE_TESTIDS, GATE_TEXT.source],
  );
}

/**
 * Wait (bounded) for any route gate to clear.
 * @returns null when the route rendered, or a reason string when it never did.
 */
export async function settledOrSkip(page, { timeoutMs = 20000, pollMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let reason = await gateReason(page);
  while (reason && Date.now() < deadline) {
    await page.waitForTimeout(pollMs);
    reason = await gateReason(page);
  }
  return reason ? `${reason} after ${Math.round(timeoutMs / 1000)}s — NOT MEASURED` : null;
}
