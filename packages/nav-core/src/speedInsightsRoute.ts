/**
 * speedInsightsRoute — turn a concrete pathname into the ROUTE it came from.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Operator, 2026-08-29: "paths appear to be measured but not routes."
 *
 * That is exactly what was happening. Five of six apps mount
 * `<SpeedInsights />` from `@vercel/speed-insights/react` with no `route`
 * prop. The library's own type declares `route?: string | null`, and without
 * it the datapoint falls back to `window.location.pathname`.
 *
 * So `/apprentices/9f1c…` and `/apprentices/3ab7…` are two different rows.
 * With a few hundred apprentices the Core Web Vitals for that ONE page are
 * split across hundreds of buckets, each with too few samples to reach the
 * p75 threshold Vercel scores on. The page effectively disappears from the
 * report — which is how an app can feel slow and still show a good score:
 * the score is computed over the paths that had enough samples, and those are
 * the static ones.
 *
 * conduit is unaffected: it uses `@vercel/speed-insights/next`, which reads
 * the route pattern from the Next router itself.
 *
 * ---------------------------------------------------------------------------
 * WHY A NORMALISER RATHER THAN THE ROUTER'S OWN PATTERN
 * ---------------------------------------------------------------------------
 * Reading the pattern from the router is more precise and was tried first. It
 * does not work here:
 *
 *   - crm7 mounts <SpeedInsights /> OUTSIDE <App />, so it sits above the
 *     router and `useParams()` returns {} — there is no pattern to read at
 *     that position, and moving it inside changes mount ordering on the
 *     app's most contended boundary.
 *   - crm7 declares only 42 `<Route path=>` for 300+ pages; the rest resolve
 *     through nested and generated routing, so a pattern table would be
 *     incomplete by construction.
 *   - the three react-router apps and the one wouter app would each need a
 *     different extraction, in a helper meant to be identical everywhere.
 *
 * This works from the pathname alone, so it is correct at any mount position
 * and identical across routers. It is a NORMALISER, not a router: it cannot
 * know a parameter's NAME, so it emits positional placeholders. `/:id` is a
 * guess about naming; `/:uuid` is a statement about shape, and the shape is
 * what is actually known.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DELIBERATELY DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does not collapse anything it cannot identify. A segment that is merely
 * long, or merely lowercase, stays as it is. Over-collapsing is worse than
 * under-collapsing here: two genuinely different pages merged into one row
 * produce a p75 that describes neither, and nobody can tell from the report
 * that it happened. Under-collapsing leaves a stray high-cardinality path,
 * which is visible and fixable.
 */

/** 8-4-4-4-12 hex, the shape Postgres `uuid` renders. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A bare integer id: `/invoices/40912`. */
const NUMERIC = /^\d+$/;

/**
 * A ULID/nanoid-style opaque token: long, mixed case or digit-bearing, and no
 * word separators. Deliberately requires a digit — `Administration` is long
 * and alphabetic, and must not be mistaken for an id.
 */
const OPAQUE_ID = /^(?=.*\d)[A-Za-z0-9_-]{16,}$/;

/** ISO date segment: `/reports/2026-08-29`. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function speedInsightsRoute(pathname: string): string {
  if (!pathname || pathname === '/') return '/';

  // Strip query and hash defensively — callers pass window.location.pathname,
  // but a caller passing href should not silently produce a distinct route.
  const path = pathname.split('?')[0].split('#')[0];

  const out = path
    .split('/')
    .map((segment) => {
      if (segment === '') return segment;
      if (UUID.test(segment)) return ':uuid';
      if (ISO_DATE.test(segment)) return ':date';
      if (NUMERIC.test(segment)) return ':id';
      if (OPAQUE_ID.test(segment)) return ':id';
      return segment;
    })
    .join('/');

  // Preserve a trailing slash only where the input had one, so `/a` and `/a/`
  // do not silently become the same row on an app that distinguishes them.
  return out;
}
