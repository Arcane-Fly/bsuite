/**
 * Money rounding — ONE implementation.
 *
 * PORTED VERBATIM from R80.4 (`r80-4-charge-calculator`) src/awards/round.ts,
 * commit 93b8643951cab759dff8428b63a29629975bb294 (2026-08-05T21:06:19+08:00,
 * branch development). R80.4 is read-only source; this file is a faithful
 * copy, not a re-derivation. Do not "fix" anything here without going back to
 * R80.4 first — the operator has confirmed R80.4's arithmetic is correct.
 *
 * WHY THIS FILE EXISTS
 * `(29.45 * 0.5).toFixed(2)` returns "14.72", not "14.73". The exact half-cent
 * 14.725 is stored as the binary double 14.724999999999999645…, so toFixed
 * rounds it DOWN. Two of six Building & Construction apprentice rates came out
 * a cent light because of exactly this.
 *
 * The nudge (+1e-9 before rounding) is large enough to lift a representation
 * error over the boundary and far too small to move a figure that was not
 * already on it.
 *
 * It had been fixed in the percentage-table helper and then written four more
 * times in four more modules, with one site — the MAPD wage import — still
 * carrying the original defect. Finding a defect class is not the same as
 * sweeping for it, so this is now the only copy: fix it here, or nowhere.
 * (Lesson taken from claude-code-bsuite-crm7's TGA paging correction, 2026-08-02.)
 *
 * These are for MONEY and RATES. Do not use them for display formatting —
 * toFixed inside a template string is fine and is not what this guards.
 */

/**
 * `Number.isFinite` as a TYPE PREDICATE.
 *
 * The built-in returns plain boolean, so `Number.isFinite(x)` does not narrow
 * `number | undefined` to `number` — every guarded site then reads as "possibly
 * undefined" and invites a non-null assertion, which is how a real undefined
 * eventually gets through. This narrows properly, so the guard the code already
 * had is the guard the type checker sees.
 */
export function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Round to cents. Null and non-finite pass through untouched.
 *
 * Overloaded so a caller who passes a plain number gets a plain number back and
 * does not have to re-narrow. The nullable overloads exist because several
 * callers deliberately carry null to mean "no figure", and turning that into 0
 * would invent a rate.
 */
export function round2(x: number): number;
export function round2(x: null): null;
export function round2(x: undefined): undefined;
export function round2(x: number | null | undefined): number | null | undefined;
export function round2(x: number | null | undefined): number | null | undefined {
  if (x === null || x === undefined) return x;
  return Number.isFinite(x) ? Math.round(x * 100 + 1e-9) / 100 : x;
}

/**
 * Format money for a human-readable explanation: "$45.30", never "$45.3".
 *
 * Every explanation string in the engine was interpolating `$${round2(x)}`,
 * which is a NUMBER and so drops the trailing zero — a $45.30 rate quoted back
 * to the user as "$45.3". Thirty-one sites across fifteen modules did it. The
 * arithmetic was right in all of them; the figure shown to the person reading
 * the quote was not, which is the half that ends up in front of a client.
 *
 * This rounds through round2() rather than calling toFixed directly, so the
 * displayed cent and the charged cent cannot disagree on a half-cent boundary.
 */
export function money(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "$—";
  return `$${round2(x).toFixed(2)}`;
}

/**
 * Round to the nearest TEN CENTS — MA000029 cl.19.5 and cl.19.6 only.
 *
 * "calculated to the nearest $0.10, less than $0.05 to be disregarded".
 *
 * D7 requires exactly one money-rounding implementation, and this is a SECOND
 * rounding RULE, not a second implementation of the same rule: this award
 * rounds its apprentice rates to a different granularity from every other one
 * in the programme. It lives here, beside round2(), for the same reason round2()
 * is here at all — so that when a third award turns out to have a third rule,
 * there is one obvious place to find the others and compare.
 *
 * The award's phrasing fixes the tie: a remainder BELOW five cents is dropped,
 * so exactly five cents rounds UP. Math.round does that natively at this scale,
 * and the same +1e-9 nudge guards the binary-representation edge that put two
 * MA000020 apprentice rates a cent light.
 *
 * Do NOT use this for anything but MA000029 apprentice and adult apprentice
 * minimum rates. Applying it to an ordinary rate would silently coarsen every
 * figure that award prints to the cent.
 */
export function roundToTenCents(x: number): number {
  if (!Number.isFinite(x)) return x;
  return Math.round(x * 10 + 1e-9) / 10;
}

/**
 * THE THIRD ROUNDING RULE — MA000071 cl.20.7, and the tie point is NOT the
 * halfway mark.
 *
 * "Rates will be calculated in multiples of $0.05, amounts of $0.02 OR LESS
 * being taken to the LOWER multiple and amounts IN EXCESS OF $0.02 being taken
 * to the HIGHER multiple."
 *
 * So the break sits between two cents and three, not at two and a half: a
 * remainder of exactly $0.02 goes DOWN and $0.03 goes UP. Treating it as a
 * round-half-to-nearest-five would push every 2-cent remainder the wrong way —
 * a cent an hour, on an apprentice rate, every hour.
 *
 * Worked in WHOLE CENTS rather than by scaling the dollar figure, because the
 * five-cent grid and binary floating point disagree often enough that a
 * multiply-and-round would need a nudge at two separate points.
 *
 * Do NOT use this for anything but MA000071 apprentice and unapprenticed junior
 * minimum rates. cl.20.7 reaches "rates for apprentices and juniors" and
 * nothing else; applying it to an adult rate would coarsen figures the award
 * publishes to the cent.
 */
export function roundToFiveCentsLowerTie(x: number): number {
  if (!Number.isFinite(x)) return x;
  const cents = Math.round(x * 100 + 1e-9);
  const lower = Math.floor(cents / 5) * 5;
  const remainder = cents - lower;
  return (remainder <= 2 ? lower : lower + 5) / 100;
}

/**
 * THE FOURTH ROUNDING RULE — MA000017 cl.19.6(b) and cl.19.7(c): "The total
 * rate must be calculated TO THE NEAREST 5 CENTS."
 *
 * A DIFFERENT RULE FROM THE ONE ABOVE, AND THE DIFFERENCE IS REAL. Both round
 * to a five-cent grid, but MA000071 fixes the tie between two cents and three,
 * while this one is plain nearest — so the break is at TWO AND A HALF cents and
 * a remainder of exactly $0.025 rounds UP. On a remainder of two cents the two
 * awards agree; on three cents they agree; there is no whole-cent remainder at
 * which they differ, which is exactly why keeping them as separate functions
 * matters: they differ only on the half-cent case, and a shared implementation
 * would silently apply one award's tie to the other's rates the first time a
 * figure landed there.
 *
 * Scaled by 20 rather than worked in cents like its neighbour: quantising to
 * whole cents first would DESTROY the half-cent this rule turns on. $10.024 is
 * nearer $10.00 than $10.05 and must round down; a cents-first implementation
 * takes it to 2.5 cents and then up, which is wrong by five cents. Measured,
 * because the first version of this function did exactly that.
 *
 * Do NOT use this for anything but MA000017 junior and apprentice rates.
 */
export function roundToNearestFiveCents(x: number): number {
  if (!Number.isFinite(x)) return x;
  return Math.round(x * 20 + 1e-9) / 20;
}

/** Round to 4dp — for per-hour figures, where a cent is too coarse. */
export function round4(x: number): number;
export function round4(x: null): null;
export function round4(x: undefined): undefined;
export function round4(x: number | null | undefined): number | null | undefined;
export function round4(x: number | null | undefined): number | null | undefined {
  if (x === null || x === undefined) return x;
  return Number.isFinite(x) ? Math.round(x * 10000 + 1e-9) / 10000 : x;
}
