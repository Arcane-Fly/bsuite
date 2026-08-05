/**
 * Output-equivalence baseline for the ported apprentice_rate_configs overlay.
 *
 * These numbers are taken directly from
 * `R80.3/src/tests/awardRulesEngine.test.ts` — "Year-12 completion selects a
 * higher apprentice_rate_configs row than Year-10" — which exercises the
 * ORIGINAL inline implementation this module was ported from
 * (`resolveRatePackage` step 2b in `awardRulesEngine.ts`). If any assertion
 * here drifts from that test file, the two implementations have diverged.
 */
import { describe, expect, it } from 'vitest';
import { applyApprenticeRateConfigOverlay } from '../apprentice-overlay.js';

describe('applyApprenticeRateConfigOverlay — R80.3 output-equivalence baseline', () => {
  it('junior_yr10 45% of $40.00 lowest-adult → $18.00/hr, above a $15.00 FWC floor', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 15.0,
      lowestAdultClassificationRate: 40.0,
      configRow: {
        apprenticeType: 'junior_yr10',
        yearOfTrade: 1,
        wagePercentage: 0.45,
        source: 'fairwork_award',
      },
    });
    expect(result.hourlyRate).toBeCloseTo(18.0, 4);
    expect(result.overlayApplied).toBe(true);
  });

  it('junior_yr12 55% of $40.00 lowest-adult → $22.00/hr, higher than the yr10 row', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 15.0,
      lowestAdultClassificationRate: 40.0,
      configRow: {
        apprenticeType: 'junior_yr12',
        yearOfTrade: 1,
        wagePercentage: 0.55,
        source: 'fairwork_award',
      },
    });
    expect(result.hourlyRate).toBeCloseTo(22.0, 4);
    expect(result.overlayApplied).toBe(true);
  });
});

describe('applyApprenticeRateConfigOverlay — overlay is a layer, not a substitute', () => {
  it('never lowers the rate below the FWC floor', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 30.0,
      lowestAdultClassificationRate: 40.0,
      configRow: {
        apprenticeType: 'junior_yr10',
        yearOfTrade: 1,
        wagePercentage: 0.45, // 40 * 0.45 = 18.00, below the 30.00 floor
        source: 'fairwork_award',
      },
    });
    expect(result.hourlyRate).toBeCloseTo(30.0, 4);
    expect(result.overlayApplied).toBe(false);
    expect(result.trace).toContain('FWC rate retained');
  });

  it('is a no-op with no matching config row', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 15.0,
      lowestAdultClassificationRate: 40.0,
      configRow: null,
    });
    expect(result.hourlyRate).toBe(15.0);
    expect(result.overlayApplied).toBe(false);
  });

  it('cannot apply without a lowest-adult-classification rate — it has nothing to multiply against', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 15.0,
      lowestAdultClassificationRate: 0,
      configRow: {
        apprenticeType: 'adult',
        yearOfTrade: 1,
        wagePercentage: 0.9,
        source: 'fairwork_award',
      },
    });
    expect(result.hourlyRate).toBe(15.0);
    expect(result.overlayApplied).toBe(false);
  });

  it('rounds the overlay rate half-up to the cent, matching the FWC convention', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 10.0,
      lowestAdultClassificationRate: 33.33,
      configRow: {
        apprenticeType: 'adult',
        yearOfTrade: 2,
        wagePercentage: 0.5, // 33.33 * 0.5 = 16.665 -> half-up 16.67
        source: 'manual',
      },
    });
    expect(result.hourlyRate).toBe(16.67);
  });
});

describe('rounding follows R80.4, not a local Math.round', () => {
  // R80.4's round.ts records this defect costing two of six Building &
  // Construction apprentice rates a cent each. `Math.round(x * 100) / 100`
  // loses a cent on an exact half-cent, because the half is stored as a binary
  // double just BELOW the boundary. 27.90 x 0.75 = 20.924999999999997.
  //
  // Operator ruling 2026-08-05: "if there is a conflict. r80.4 wins."
  it('does not go a cent light on an exact half-cent', () => {
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 10,
      lowestAdultClassificationRate: 27.9,
      configRow: {
        apprenticeType: 'junior_yr12',
        yearOfTrade: 3,
        wagePercentage: 0.75,
        source: 'fairwork_award',
      },
    })
    // The plain Math.round pattern yields 20.92 here.
    expect(result.hourlyRate).toBe(20.93)
    expect(result.overlayApplied).toBe(true)
  })

  it('leaves a figure that was never on the boundary untouched', () => {
    // The nudge must be far too small to move anything not already on a half-cent.
    const result = applyApprenticeRateConfigOverlay({
      fwcFloorRate: 10,
      lowestAdultClassificationRate: 40,
      configRow: {
        apprenticeType: 'adult',
        yearOfTrade: 1,
        wagePercentage: 0.45,
        source: 'fairwork_award',
      },
    })
    expect(result.hourlyRate).toBe(18)
  })
})
