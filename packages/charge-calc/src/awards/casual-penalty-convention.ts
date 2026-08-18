/**
 * CASUAL PENALTY CONVERSION — PER AWARD. NEVER MA000020's RULE BORROWED.
 *
 * THE DEFECT THIS FILE FIXES: `calculate.ts` multiplied the casual-LOADED
 * wage by the STANDARD penalty multiplier, unconditionally, on every award:
 *
 *     base x 1.25 (casual loading) x 1.50 (standard Saturday penalty) = 187.5%
 *
 * For MA000020 (Building & Construction) cl.12.5/12.6 the correct figure is
 * 175% — the casual conversion is ADDITIVE (+25 percentage points on the
 * STANDARD multiplier, applied to the BASE rate), not multiplicative on an
 * already-loaded rate. 1.875 / 1.75 = 1.0714 — a 7.14% overstatement, exact,
 * on every casual penalty line, on every award, because the same wrong
 * formula was applied to all of them regardless of what each award's own
 * clauses actually say.
 *
 * THIS MODULE IS THE SINGLE CANONICAL COPY of this clause table across the
 * BSuite estate. It was ported (same citations, same refusal semantics, same
 * rounding RULES and constants — verified functionally identical, not a
 * literal byte-for-byte diff: round2/round4 are inlined here rather than
 * imported, and the MA000020 public-holiday branch is an explicit 2.75
 * rather than a delegated call, both confirmed to produce the same numbers
 * as R80.4's originals) from R80.4's `src/awards/casual-penalty-
 * convention.ts`, which remains the verified origin of every figure below —
 * see that file's git history (up to its deletion) for the clause-by-clause
 * research trail.
 *
 * CONSOLIDATED, 2026-08-17: R80.4 now depends on `@bsuite/charge-calc` and
 * imports this module directly — see R80.4 PR #90
 * (github.com/GaryOcean428/R80.4). R80.4's own copy of this file is DELETED;
 * this is the only copy left anywhere in the estate. (That PR's dependency
 * on `@bsuite/charge-calc@^0.13.0` does not resolve until this package
 * publishes 0.13.0+ to npm, which happens only once this fix promotes from
 * bsuite's development to main — see that PR's description for the
 * sequencing. Until then this file and R80.4's deleted one remain the
 * historical record of what was ported; there is no second copy to drift.)
 *
 * VERIFIED PER AWARD (2026-08-11), against awards/docx-text/<CODE>.txt — the
 * cached plain-text export that preserves (a)/(b)/(c) sub-clause lettering
 * the markdown conversion destroys:
 *
 * MA000020 cl.12.5/12.6 — ADDITIVE, in percentage points. cl.12.5(a): "where
 * the relevant penalty rate is 150%, the employee must be paid 175%"; (b):
 * "200% ... 225%". cl.12.6: a public holiday is a flat 275%. The clause only
 * states 150->175 and 200->225 explicitly; the NOTE under cl.12.5 generalises
 * the METHOD ("calculated by adding the casual loading ... to the ... penalty
 * rates") to every other row. 275% is exactly round2(250% + 25pts), so the
 * flat public-holiday figure and the generic additive formula agree — no
 * special case is needed to reproduce it.
 *
 * MA000004 (General Retail) cl.11.1 — the SAME additive method, but with its
 * own base percentages. Table 11 (cl.21.2(c), overtime): 150->175, 200->225,
 * 200->225 (Sunday), 250->275 (public holiday) — every row +25 points exactly,
 * confirmed by NOTE 2: "calculated by adding the casual loading ... to the
 * overtime rates". Table 12 (cl.22.1, penalty rates): 125->150 (Mon-Fri
 * evening and Saturday), 150->175 (Sunday), 225->250 (public holiday) — again
 * +25 points on every row. AGREES with MA000020's METHOD; disagrees on the
 * base percentages, which live in the caller's own PenaltyRate.mult and need
 * no special-casing here.
 *
 * MA000009 (Hospitality) — SPLITS BY CATEGORY, and the two categories use
 * OPPOSITE conventions:
 *   - cl.29.2, Table 14 (penalty rates) publishes an explicit CASUAL column:
 *     100->125, 125->150 (Saturday), 150->175 (Sunday), 225->250 (public
 *     holiday) — additive, +25 points every row, same method as MA000020.
 *   - cl.28.4, Table 13 (overtime rates) publishes NO casual column at all —
 *     just "the relevant percentage ... of the employee's ordinary hourly
 *     rate". cl.11.1 defines a casual's "ordinary hourly rate" as the base
 *     rate PLUS the 25% loading, so for overtime the SAME multiplier applies
 *     to the ALREADY-LOADED rate — MULTIPLICATIVE, not additive. Applying
 *     MA000020's additive rule to MA000009 overtime would UNDER-state a
 *     casual's overtime pay (150% + 25pts = 175% against the correct
 *     150% x 1.25 = 187.5%).
 *
 * MA000036 (Plumbing) — SPLITS BY CATEGORY THE OPPOSITE WAY to MA000009:
 *   - cl.22.1(a) (overtime) publishes an explicit casual column and its own
 *     NOTE: "calculated by adding the casual loading prescribed by clause
 *     12.2 to the overtime rates ... prescribed by clause 22.1(a)" — additive,
 *     +25 points on every row (150->175, 200->225, 250->275, etc).
 *   - cl.23 (penalty rates — shiftwork cl.23.1, weekend cl.23.2, public
 *     holiday cl.23.3) publishes NO casual column — every rate is stated as a
 *     flat percentage "of their ordinary hourly rate", and cl.12.2 defines a
 *     casual's ordinary hourly rate as base + 25%. MULTIPLICATIVE, same
 *     reasoning as MA000009's overtime.
 *   Between MA000009 and MA000036 the SAME two clause categories
 *   ("overtime" vs "penalty" on PenaltyCategoryType) take OPPOSITE
 *   conventions in the two awards — proof that category alone never predicts
 *   the convention and every (award, category) pair has to be verified on its
 *   own clause text.
 *
 * MA000010 (Manufacturing) cl.11.1(d) — states the multiplicative rule
 * EXPLICITLY and generally: "Where this award refers to a penalty rate,
 * overtime rate or shift loading as being calculated as a percentage of the
 * ordinary hourly rate, that reference will (for a casual employee) instead
 * be taken to be a reference to the casual ordinary hourly rate" — i.e. every
 * percentage in the award applies to the ALREADY-LOADED (base x 1.25) rate,
 * for BOTH categories. This is the convention MA000020's cl.12.5/12.6 exists
 * PRECISELY TO AVOID for its own penalty rows — proof the two conventions are
 * genuinely opposite, not just differently worded.
 *   NAMED GAP: cl.11.1(e) carves out a 17.5% (not 25%) casual loading for
 *   vehicle manufacturing employees in the technical field (cl.4.8(a)(xi)),
 *   with an election for 25% instead per cl.48.1/48.2. That sub-population is
 *   NOT modelled here — this file's MA000010 entry prices the general cl.11.1
 *   25%-loading population only. A caller pricing that named exception must
 *   not read this module's MA000010 result as covering it.
 *
 * MA000025 (Electrical) — DELIBERATELY UNMODELLED, and this is the case the
 * whole per-row design exists for. Schedule B.3.1/B.3.2 publish the casual
 * cohort's OWN dollar figures directly, and they do not reduce to one
 * formula: B.3.1's public holiday is 312.5% (250% x 1.25 — MULTIPLICATIVE)
 * while B.3.2's afternoon/night first-2-hours is 140% (115% + 25 points —
 * ADDITIVE) and its Sunday rate is 187.5% (150% x 1.25 — MULTIPLICATIVE
 * again). Refusing here is correct, not a gap to close with a smarter
 * formula: the award's own words are already machine-readable via R80.4's
 * `mapd-penalties.ts` cohort parser (`engagement: "casual"`), which ingests
 * these rows AS PUBLISHED rather than computing them.
 *
 * ANY AWARD NOT LISTED IN `CONVENTIONS` REFUSES BY DEFAULT — absence, not an
 * opt-out flag, is what "not yet modelled" means here.
 */

import type { PenaltyCategoryType } from '../types.js';

/**
 * Thrown by casualPenaltyMultiplierForAward instead of returning a number,
 * when the (award, category) pair has no verified conversion. A TYPED
 * payload (not a bare Error) so a caller can `instanceof`-match it apart
 * from any other reason the resolver can throw, with the award/category/row
 * carried as DATA rather than only baked into a message string — and there
 * is NO numeric field anywhere on this path. A nullable or flagged number is
 * exactly the shape a hurried caller learns to skip past; removing the
 * number from existence is what makes the refusal impossible to accidentally
 * spend.
 */
export class CasualPenaltyConventionUnmodelled extends Error {
  override readonly name = 'CasualPenaltyConventionUnmodelled';
  readonly award: string;
  readonly category: PenaltyCategoryType;
  readonly penaltyId: string;

  constructor(award: string, category: PenaltyCategoryType, penaltyId: string) {
    super(
      `No verified casual-penalty conversion is modelled for ${award || '(no award code)'} ` +
      `(${category} row "${penaltyId}"). MA000020's cl.12.5/12.6 additive rule is AWARD-SPECIFIC and ` +
      `must not be borrowed — every award checked against it (MA000004, MA000009, MA000010, MA000025, ` +
      `MA000036) diverges from it in at least one respect, and MA000025 diverges BY PENALTY ROW rather ` +
      `than by a single formula (its casual public holiday is 312.5%, multiplicative; its casual ` +
      `afternoon/night shift is 140%, additive — Schedule B.3.1/B.3.2). Either add a verified ` +
      `(award, category) entry to CONVENTIONS in casual-penalty-convention.ts with its own clause citation, ` +
      `or — for an award that publishes its own casual cohort, like MA000025 — ingest the casual rows ` +
      `directly from the MAPD API instead of computing a conversion at all.`,
    );
    this.award = award;
    this.category = category;
    this.penaltyId = penaltyId;
  }
}

export interface CasualPenaltyResult {
  multiplier: number;
  reason: string;
}

/**
 * Round to cents, with a tiny nudge (+1e-9) to lift a binary
 * floating-point representation error (e.g. 14.725 stored as
 * 14.724999999999999645...) over a rounding boundary before `Math.round`
 * sees it. Ported from R80.4's `round.ts` — do not reimplement without the
 * nudge; `(29.45 * 0.5).toFixed(2)` rounds DOWN to "14.72" without it.
 */
function round2(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 100 + 1e-9) / 100 : x;
}

/**
 * Round to 4dp — for the MULTIPLIER itself, not money. A quarter-percentage-
 * point result — 133% x 1.25 = 166.25%, i.e. a multiplier of 1.6625 — is a
 * real, legitimate value here, not floating-point noise. Rounding it to 2dp
 * (the convention for MONEY) would silently discard it and move every
 * dollar built on this multiplier by up to half a cent per dollar of
 * ordinary rate. Money values downstream still round to the cent via
 * whatever the caller's own money-rounding helper is, at the point they
 * become dollars.
 */
function round4(x: number): number {
  return Number.isFinite(x) ? Math.round(x * 10000 + 1e-9) / 10000 : x;
}

/** The generic 25% casual-loading fraction. See MA000010's NAMED GAP above for the one
 *  verified sub-population (cl.11.1(e)/48) that uses 17.5% instead — not modelled here. */
const CASUAL_LOADING_FRACTION = 0.25;

type Convention =
  | { kind: 'additive_25_points'; cite: string }
  | { kind: 'multiplicative_on_loaded_rate'; cite: string };

/**
 * AWARDCODE -> PenaltyCategoryType -> Convention. Absence at EITHER level —
 * unknown award, or a category not listed for a known award — means
 * "unmodelled", which is a REFUSAL, not a silent identity or default.
 */
const CONVENTIONS: Record<string, Partial<Record<PenaltyCategoryType, Convention>>> = {
  MA000020: {
    overtime: { kind: 'additive_25_points', cite: 'MA000020 cl.12.5/12.6' },
    penalty: { kind: 'additive_25_points', cite: 'MA000020 cl.12.5/12.6' },
  },
  MA000004: {
    overtime: { kind: 'additive_25_points', cite: 'MA000004 cl.11.1, Table 11 (overtime rates)' },
    penalty: { kind: 'additive_25_points', cite: 'MA000004 cl.11.1, Table 12 (penalty rates)' },
  },
  MA000009: {
    penalty: { kind: 'additive_25_points', cite: 'MA000009 cl.29.2, Table 14 (penalty rates)' },
    /* overtime intentionally ABSENT from this award's additive entry — Table 13
       (cl.28.4) publishes no casual column, so casual overtime is multiplicative;
       see the entry below. */
  },
  MA000036: {
    overtime: { kind: 'additive_25_points', cite: 'MA000036 cl.12.2, cl.22.1(a) (overtime, explicit casual column + NOTE)' },
    /* penalty (cl.23 shiftwork/weekend/public holiday) intentionally ABSENT —
       no casual column; multiplicative, see the entry below. */
  },
  MA000010: {
    overtime: { kind: 'multiplicative_on_loaded_rate', cite: 'MA000010 cl.11.1(a),(d)' },
    penalty: { kind: 'multiplicative_on_loaded_rate', cite: 'MA000010 cl.11.1(a),(d)' },
  },
};

/* Second pass — the multiplicative entries that share a category key with an
   additive one already set above (MA000009.overtime, MA000036.penalty) are
   added here rather than inline, so the block above reads as "what IS
   additive for this award" without the opposite-convention row breaking that
   scan. Plain object mutation, not a second registry: CONVENTIONS remains the
   single source casualPenaltyMultiplierForAward reads. */
CONVENTIONS.MA000009!.overtime = {
  kind: 'multiplicative_on_loaded_rate',
  cite: 'MA000009 cl.11.1 + cl.28.4, Table 13 (overtime rates, no casual column)',
};
CONVENTIONS.MA000036!.penalty = {
  kind: 'multiplicative_on_loaded_rate',
  cite: 'MA000036 cl.12.2, cl.23 (shiftwork/weekend/public holiday, no casual column)',
};

function additiveResult(
  awardCode: string,
  standardMult: number,
  isPublicHoliday: boolean,
  cite: string,
): CasualPenaltyResult {
  /* MA000020 cl.12.6 states the public-holiday figure as a literal 275%,
     not as a derivation — kept as an explicit flat value (matching R80.4's
     pre-existing, verified implementation) rather than relying on
     round2(standardMult + 0.25) landing on the same number, so a caller
     that passes an unexpected standardMult for the 'ph' row still gets the
     award's stated 275%, not a number derived from bad input. For every
     other row, and for every other award, the two are mathematically
     identical at the award's real standard percentages (250% + 25pts =
     275% too) — this branch changes nothing observable except pinning that
     one figure against input drift. */
  if (awardCode === 'MA000020' && isPublicHoliday) {
    return {
      multiplier: 2.75,
      reason: 'MA000020 cl.12.6: a casual working a public holiday is paid 275% of the ordinary hourly rate ' +
        '— NOT 250% x 1.25 (312.5%). The loading is additive.',
    };
  }
  const multiplier = round2(standardMult + CASUAL_LOADING_FRACTION);
  return {
    multiplier,
    reason: `${cite}: ${round2(standardMult * 100)}% + ${round2(CASUAL_LOADING_FRACTION * 100)} percentage ` +
      `points = ${round2(multiplier * 100)}% of the ordinary hourly rate. Additive per this award's own ` +
      `casual table — NOT compounded with the standard multiplier.`,
  };
}

function multiplicativeResult(standardMult: number, cite: string): CasualPenaltyResult {
  const multiplier = round4(standardMult * (1 + CASUAL_LOADING_FRACTION));
  return {
    multiplier,
    reason: `${cite}: this award has no separate casual penalty table — the standard percentage applies to ` +
      `the CASUAL ordinary hourly rate, which already carries the ${round2(CASUAL_LOADING_FRACTION * 100)}% ` +
      `loading. ${round2(standardMult * 100)}% x ${1 + CASUAL_LOADING_FRACTION} = ${round2(multiplier * 100)}% ` +
      `of the base (unloaded) rate.`,
  };
}

/**
 * Resolve the casual multiplier for one penalty row, under ONE award's own
 * convention. The returned multiplier is meant to be applied to the BASE
 * (un-casual-loaded) wage — never to a wage that already carries the 25%
 * casual loading, which is exactly the compounding this module exists to
 * prevent. Throws CasualPenaltyConventionUnmodelled — never returns a
 * number — when the (award, category) pair has not been individually
 * verified. See the module doc comment for what was checked per award.
 */
export function casualPenaltyMultiplierForAward({
  award,
  category,
  standardMult,
  isPublicHoliday = false,
  penaltyId,
}: {
  award: string;
  category: PenaltyCategoryType;
  standardMult: number;
  isPublicHoliday?: boolean;
  penaltyId: string;
}): CasualPenaltyResult {
  const code = (award || '').toUpperCase().trim();
  const conv = CONVENTIONS[code]?.[category];
  if (!conv) throw new CasualPenaltyConventionUnmodelled(code, category, penaltyId);
  return conv.kind === 'additive_25_points'
    ? additiveResult(code, standardMult, isPublicHoliday, conv.cite)
    : multiplicativeResult(standardMult, conv.cite);
}
