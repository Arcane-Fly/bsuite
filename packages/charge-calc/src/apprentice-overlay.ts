// Apprentice rate config overlay — single source of truth for both crm7 and
// R80.3 (bsuite lazy-hopping-nest plan, Amendment A.2).
//
// `apprentice_rate_configs.wage_percentage` is a MULTIPLIER over the lowest
// full-time ADULT classification rate for the same award. It is a layer, not
// a substitute base rate: it is structurally incapable of answering "what is
// the rate" on its own, because it has nothing to multiply against until a
// base (FWC-derived) rate is already known. See the plan's governing
// constraint section for the full trace.
//
// Ported from `R80.3/src/services/awardRulesEngine.ts` `resolveRatePackage`
// step 2b — same rounding (round-half-up to the cent), same floor rule (the
// FWC-derived rate is a legal minimum; the overlay only ever raises the
// rate, never lowers it below the award). Output-equivalence baseline:
// `lowestAdultClassificationRate = 40.00`, `wage_percentage = 0.45` →
// `$18.00/hr`; `wage_percentage = 0.55` → `$22.00/hr` — both reproduced
// exactly in this module's test suite from
// `R80.3/src/tests/awardRulesEngine.test.ts` ("Year-12 completion selects a
// higher apprentice_rate_configs row than Year-10").
//
// R80.3 has NOT yet been repointed to call this shared function — its inline
// copy is correct and live today, and repointing it is a follow-up once this
// package is published and R80.3's dependency is bumped (this environment
// has no npm publish credentials). This module exists so crm7 has a correct,
// non-duplicated implementation to consume, and so a future R80.3 refactor
// has something to delegate to instead of carrying its own second copy —
// the plan's explicit warning is "a fourth Fair Work integration is the
// failure mode to avoid".

/** The one apprentice_rate_configs row relevant to a given wage resolution. */
export interface ApprenticeRateConfigOverlayRow {
  /** apprentice_rate_configs.apprentice_type — junior_yr10 | junior_yr12 | adult | sba_sbt */
  apprenticeType: string;
  /** apprentice_rate_configs.year_of_trade */
  yearOfTrade: number;
  /** apprentice_rate_configs.wage_percentage — a fraction, e.g. 0.45 for 45%. */
  wagePercentage: number;
  /** apprentice_rate_configs.source — 'fairwork_award' | 'eba' | 'manual', carried through for provenance. */
  source: string;
}

export interface ApprenticeRateOverlayInput {
  /** The FWC-derived (or otherwise resolved) hourly rate before the overlay — the legal floor. */
  fwcFloorRate: number;
  /**
   * Lowest full-time ADULT classification rate for the same award. The
   * overlay cannot apply without this — it has nothing to multiply against.
   */
  lowestAdultClassificationRate: number;
  /** The matching apprentice_rate_configs row, or null when none matches (e.g. trainee/junior codes with no config class). */
  configRow: ApprenticeRateConfigOverlayRow | null;
}

export interface ApprenticeRateOverlayResult {
  /** The rate to actually use: the overlay rate when it applies and clears the floor, otherwise `fwcFloorRate` unchanged. */
  hourlyRate: number;
  /** True when the overlay rate was used (it existed, was positive, and was >= the FWC floor). */
  overlayApplied: boolean;
  /** Human-readable line for compliance audit / appliedRules-or-warnings logging, mirroring R80.3's message shape. */
  trace: string;
}

/**
 * Apply the apprentice_rate_configs percentage overlay to a base rate.
 *
 * Pure and side-effect-free: callers supply the already-resolved FWC floor
 * rate, the lowest adult classification rate, and (if one matched) the
 * config row — this function does no data access and makes no award/table
 * assumptions, so it works identically whether the floor rate came from
 * crm7's `fairworkEnhancedService` or R80.3's `fairworkApi`.
 */
export function applyApprenticeRateConfigOverlay(
  input: ApprenticeRateOverlayInput,
): ApprenticeRateOverlayResult {
  const { fwcFloorRate, lowestAdultClassificationRate, configRow } = input;

  if (!configRow) {
    return {
      hourlyRate: fwcFloorRate,
      overlayApplied: false,
      trace: 'apprentice_rate_configs overlay skipped: no matching config row',
    };
  }

  if (lowestAdultClassificationRate <= 0) {
    return {
      hourlyRate: fwcFloorRate,
      overlayApplied: false,
      trace:
        'apprentice_rate_configs overlay skipped: no lowest-adult-classification rate supplied ' +
        '(the overlay has nothing to multiply against)',
    };
  }

  // Round half-up to the cent — same convention as the FWC rate itself
  // (fairworkEnhancedService.roundToCent / R80.3's identical Math.round pattern).
  const configRate =
    Math.round(lowestAdultClassificationRate * configRow.wagePercentage * 100) / 100;

  if (configRate <= 0) {
    return {
      hourlyRate: fwcFloorRate,
      overlayApplied: false,
      trace: 'apprentice_rate_configs overlay produced $0 — FWC floor retained',
    };
  }

  if (configRate >= fwcFloorRate) {
    return {
      hourlyRate: configRate,
      overlayApplied: true,
      trace:
        `apprentice_rate_configs overlay: ${configRow.apprenticeType} Year ${configRow.yearOfTrade} ` +
        `→ ${(configRow.wagePercentage * 100).toFixed(1)}% × $${lowestAdultClassificationRate.toFixed(2)}/hr ` +
        `= $${configRate.toFixed(2)}/hr (source: ${configRow.source})`,
    };
  }

  return {
    hourlyRate: fwcFloorRate,
    overlayApplied: false,
    trace:
      `apprentice_rate_configs row for ${configRow.apprenticeType} Year ${configRow.yearOfTrade} ` +
      `produces $${configRate.toFixed(2)}/hr < FWC floor $${fwcFloorRate.toFixed(2)}/hr — FWC rate retained`,
  };
}
