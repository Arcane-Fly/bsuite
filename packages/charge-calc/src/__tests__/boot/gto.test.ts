import { describe, it, expect } from 'vitest';
import { compareGTOBOOT } from '../../boot/gto.js';
import type {
  AwardSchedule,
  EATerms,
  RosterScenario,
  GTOPlacement,
  GTOPlacementSchedule,
} from '../../boot/types.js';
import { ENGINE_VERSION } from '../../boot/types.js';

// ─── Shared Fixtures ───

const makeAwardSchedule = (baseRate: number): AwardSchedule => ({
  awardCode: 'MA000020',
  awardName: 'Building Award',
  classifications: [{
    classificationFixedId: 1,
    name: 'CW/ECW Level 1',
    terms: {
      baseHourlyRate: baseRate,
      casualLoading: 0.25,
      penaltyRates: {
        saturday: 1.5, sunday: 2.0, publicHoliday: 2.5,
        overtime15x: 1.5, overtime2x: 2.0,
        nightShift: 1.3, afternoonShift: 1.15,
      },
      allowances: [],
      superRate: 0.12,
      leaveLoadingPercent: 17.5,
      annualLeaveDays: 20,
      personalLeaveDays: 10,
      redundancyWeeks: null,
    },
  }],
  nonMonetary: {
    ordinaryHoursPerWeek: 38,
    maxDailyOrdinaryHours: null,
    spanOfHours: { start: '06:00', end: '18:00' },
    rosteringNotice: null,
    minimumEngagementHours: null,
    mealBreakAfterHours: null,
    restBreakMinutes: null,
    consultationObligations: null,
    disputeResolution: null,
    noticeOfTermination: null,
  },
});

const makeEA = (baseRate: number): EATerms => ({
  agreementName: 'Test EA',
  lodgementDate: '2024-09-15',
  classifications: [{
    id: 'ea-cls-1',
    name: 'EA Level 1',
    awardClassificationId: 1,
    terms: {
      baseHourlyRate: baseRate,
      casualLoading: 0.25,
      penaltyRates: {
        saturday: 1.5, sunday: 2.0, publicHoliday: 2.5,
        overtime15x: 1.5, overtime2x: 2.0,
        nightShift: 1.3, afternoonShift: 1.15,
      },
      allowances: [],
      superRate: 0.12,
      leaveLoadingPercent: 17.5,
      annualLeaveDays: 20,
      personalLeaveDays: 10,
      redundancyWeeks: null,
    },
    loadedRate: null,
  }],
  nonMonetary: {
    ordinaryHoursPerWeek: 38,
    maxDailyOrdinaryHours: null,
    spanOfHours: { start: '06:00', end: '18:00' },
    rosteringNotice: null,
    minimumEngagementHours: null,
    mealBreakAfterHours: null,
    restBreakMinutes: null,
    consultationObligations: null,
    disputeResolution: null,
    noticeOfTermination: null,
  },
});

const makeScenario = (): RosterScenario => ({
  scenarioType: 'typical',
  label: 'Standard Mon-Fri',
  employmentType: 'fullTime',
  ordinaryHoursPerWeek: 38,
  weeklyBreakdown: {
    ordinaryDay: 38, saturdayOrdinary: 0, sundayOrdinary: 0,
    publicHoliday: 0, overtime15x: 0, overtime2x: 0,
    nightShift: 0, afternoonShift: 0, casualLoading: 0,
  },
  weeksPerYear: 48,
});

function makePlacement(
  hostId: string,
  hostName: string,
  awardBaseRate: number,
  timeAllocation: number,
  scenarios?: RosterScenario[],
): GTOPlacement {
  return {
    hostEmployerId: hostId,
    hostEmployerName: hostName,
    applicableAwards: [makeAwardSchedule(awardBaseRate)],
    scenarios: scenarios ?? [makeScenario()],
    timeAllocation,
  };
}

function makePlacementSchedule(
  placements: GTOPlacement[],
  overrides?: Partial<GTOPlacementSchedule>,
): GTOPlacementSchedule {
  return {
    apprenticeId: 'apprentice-001',
    currentYear: 2,
    placements,
    ...overrides,
  };
}

// ─── Tests ───

describe('compareGTOBOOT', () => {
  // ─── 1. Single placement pass → overall pass ───
  describe('1. Single placement pass → overall pass', () => {
    it('returns pass when the single placement passes BOOT', () => {
      // Award base rate $25, EA base rate $30 => clear pass
      const placement = makePlacement('host-1', 'Acme Construction', 25, 1.0);
      const schedule = makePlacementSchedule([placement]);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('pass');
      expect(result.placements).toHaveLength(1);
      expect(result.placements[0].hostEmployerId).toBe('host-1');
      expect(result.placements[0].hostEmployerName).toBe('Acme Construction');
      expect(result.placements[0].timeAllocation).toBe(1.0);
      expect(result.placements[0].bootResult.overallVerdict).toBe('pass');
      expect(result.apprenticeId).toBe('apprentice-001');
      expect(result.currentYear).toBe(2);
      expect(result.humanReviewRequired).toBe(true);
      expect(result.engineVersion).toBe(ENGINE_VERSION);
      expect(result.assessedAt).toBeTruthy();
    });
  });

  // ─── 2. Single placement fail → overall fail ───
  describe('2. Single placement fail → overall fail', () => {
    it('returns fail when the single placement fails BOOT', () => {
      // Award base rate $30, EA base rate $25 => fail
      const placement = makePlacement('host-1', 'Acme Construction', 30, 1.0);
      const schedule = makePlacementSchedule([placement]);
      const ea = makeEA(25);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('fail');
      expect(result.placements).toHaveLength(1);
      expect(result.placements[0].bootResult.overallVerdict).toBe('fail');
    });
  });

  // ─── 3. 3 placements: 2 pass, 1 fails → overall fail (ANY fail = fail) ───
  describe('3. Three placements: 2 pass, 1 fails → overall fail', () => {
    it('returns fail when any single placement fails (s.193)', () => {
      const placements = [
        // Pass: award $25, EA $30
        makePlacement('host-1', 'Good Builder A', 25, 0.4),
        // Pass: award $24, EA $30
        makePlacement('host-2', 'Good Builder B', 24, 0.3),
        // Fail: award $35, EA $30
        makePlacement('host-3', 'Expensive Site', 35, 0.3),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('fail');
      // Verify individual results
      expect(result.placements[0].bootResult.overallVerdict).toBe('pass');
      expect(result.placements[1].bootResult.overallVerdict).toBe('pass');
      expect(result.placements[2].bootResult.overallVerdict).toBe('fail');
    });
  });

  // ─── 4. 3 placements: all pass → overall pass ───
  describe('4. Three placements: all pass → overall pass', () => {
    it('returns pass when all placements pass', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.5),
        makePlacement('host-2', 'Builder B', 24, 0.3),
        makePlacement('host-3', 'Builder C', 23, 0.2),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(32); // Clearly above all award rates

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('pass');
      for (const p of result.placements) {
        expect(p.bootResult.overallVerdict).toBe('pass');
      }
    });
  });

  // ─── 5. 3 placements: marginal overall ───
  describe('5. Three placements: marginal overall', () => {
    it('returns marginal when all placements are marginal', () => {
      // All awards at $29.50, EA at $30.39 => ~3% above each => marginal
      const placements = [
        makePlacement('host-1', 'Builder A', 29.50, 0.5),
        makePlacement('host-2', 'Builder B', 29.50, 0.3),
        makePlacement('host-3', 'Builder C', 29.50, 0.2),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30.39);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('marginal');
      for (const p of result.placements) {
        expect(p.bootResult.overallVerdict).toBe('marginal');
      }
    });

    it('returns marginal when some pass and one is marginal (no fails)', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.5),     // Clear pass
        makePlacement('host-2', 'Builder B', 29.50, 0.5),  // Marginal
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30.39);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('marginal');
      expect(result.placements[0].bootResult.overallVerdict).toBe('pass');
      expect(result.placements[1].bootResult.overallVerdict).toBe('marginal');
    });
  });

  // ─── 6. Time allocation validation warning ───
  describe('6. Time allocation validation warning', () => {
    it('warns when allocations do not sum to 1.0 (>5% off)', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.5),
        makePlacement('host-2', 'Builder B', 25, 0.3),
        // Sums to 0.8 — 20% off from 1.0
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const allocationWarning = result.warnings.find(
        (w) => w.code === 'TIME_ALLOCATION_MISMATCH',
      );
      expect(allocationWarning).toBeDefined();
      expect(allocationWarning!.severity).toBe('warning');
    });

    it('does not warn when allocations sum close to 1.0 (within 5%)', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.51),
        makePlacement('host-2', 'Builder B', 25, 0.48),
        // Sums to 0.99 — 1% off, within threshold
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const allocationWarning = result.warnings.find(
        (w) => w.code === 'TIME_ALLOCATION_MISMATCH',
      );
      expect(allocationWarning).toBeUndefined();
    });

    it('warns when allocations exceed 1.0 by >5%', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.6),
        makePlacement('host-2', 'Builder B', 25, 0.6),
        // Sums to 1.2 — 20% off
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const allocationWarning = result.warnings.find(
        (w) => w.code === 'TIME_ALLOCATION_MISMATCH',
      );
      expect(allocationWarning).toBeDefined();
    });
  });

  // ─── 7. Empty placements → indeterminate ───
  describe('7. Empty placements → indeterminate', () => {
    it('returns indeterminate with no placements', () => {
      const schedule = makePlacementSchedule([]);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.overallVerdict).toBe('indeterminate');
      expect(result.placements).toHaveLength(0);
      expect(result.weakestPlacement).toBeNull();
      expect(result.weightedAggregateDelta).toBe(0);
    });

    it('adds a warning for empty placements', () => {
      const schedule = makePlacementSchedule([]);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const emptyWarning = result.warnings.find(
        (w) => w.code === 'NO_PLACEMENTS',
      );
      expect(emptyWarning).toBeDefined();
      expect(emptyWarning!.severity).toBe('critical');
    });
  });

  // ─── 8. Weakest placement identification ───
  describe('8. Weakest placement identification', () => {
    it('identifies the placement with the worst total delta', () => {
      const placements = [
        // Pass with good margin: award $25, EA $35 => large positive delta
        makePlacement('host-1', 'Easy Site', 25, 0.3),
        // Barely passes: award $29.50, EA $30.39 => small positive delta
        makePlacement('host-2', 'Medium Site', 29.50, 0.4),
        // Fails: award $35, EA $30 => negative delta (worst)
        makePlacement('host-3', 'Hard Site', 35, 0.3),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.weakestPlacement).not.toBeNull();
      expect(result.weakestPlacement!.hostEmployerId).toBe('host-3');
      expect(result.weakestPlacement!.hostEmployerName).toBe('Hard Site');
    });

    it('identifies weakest among all-passing placements', () => {
      const placements = [
        // Big pass: award $20, EA $35
        makePlacement('host-1', 'Easy Site', 20, 0.5),
        // Smaller pass: award $28, EA $35
        makePlacement('host-2', 'Harder Site', 28, 0.5),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(35);

      const result = compareGTOBOOT(schedule, ea);

      expect(result.weakestPlacement).not.toBeNull();
      expect(result.weakestPlacement!.hostEmployerId).toBe('host-2');
    });
  });

  // ─── 9. Weighted aggregate delta calculation ───
  describe('9. Weighted aggregate delta calculation', () => {
    it('calculates weighted aggregate delta correctly', () => {
      // Use a single placement for a simple check
      const placement = makePlacement('host-1', 'Builder A', 25, 1.0);
      const schedule = makePlacementSchedule([placement]);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      // With 100% allocation, weighted delta = totalDelta * 1.0
      const expectedDelta = result.placements[0].bootResult.summary.totalDelta;
      expect(result.weightedAggregateDelta).toBe(expectedDelta);
    });

    it('calculates weighted aggregate delta for multiple placements', () => {
      const placements = [
        makePlacement('host-1', 'Builder A', 25, 0.5),
        makePlacement('host-2', 'Builder B', 25, 0.5),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      // Both placements have same award/EA rates => same totalDelta
      // weightedAggregateDelta = (delta * 0.5) + (delta * 0.5) = delta
      const delta = result.placements[0].bootResult.summary.totalDelta;
      const expectedWeighted = delta * 0.5 + delta * 0.5;
      // Allow rounding tolerance
      expect(Math.abs(result.weightedAggregateDelta - expectedWeighted)).toBeLessThan(0.01);
    });

    it('applies different weights correctly', () => {
      const placements = [
        // Pass: award $25, EA $30
        makePlacement('host-1', 'Builder A', 25, 0.7),
        // Fail: award $35, EA $30
        makePlacement('host-2', 'Builder B', 35, 0.3),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const deltaA = result.placements[0].bootResult.summary.totalDelta;
      const deltaB = result.placements[1].bootResult.summary.totalDelta;
      const expectedWeighted = deltaA * 0.7 + deltaB * 0.3;

      expect(Math.abs(result.weightedAggregateDelta - expectedWeighted)).toBeLessThan(0.01);
    });
  });

  // ─── Additional structural checks ───
  describe('Structural checks', () => {
    it('humanReviewRequired is always true regardless of verdict', () => {
      // Pass case
      const passSchedule = makePlacementSchedule([
        makePlacement('host-1', 'Builder', 25, 1.0),
      ]);
      const passResult = compareGTOBOOT(passSchedule, makeEA(35));
      expect(passResult.humanReviewRequired).toBe(true);

      // Fail case
      const failSchedule = makePlacementSchedule([
        makePlacement('host-1', 'Builder', 40, 1.0),
      ]);
      const failResult = compareGTOBOOT(failSchedule, makeEA(25));
      expect(failResult.humanReviewRequired).toBe(true);

      // Empty/indeterminate case
      const emptySchedule = makePlacementSchedule([]);
      const emptyResult = compareGTOBOOT(emptySchedule, makeEA(30));
      expect(emptyResult.humanReviewRequired).toBe(true);
    });

    it('collects warnings from all placements', () => {
      // Create a placement that produces a BOOT_FAIL warning
      const placements = [
        makePlacement('host-1', 'Good Builder', 25, 0.5),
        makePlacement('host-2', 'Bad Builder', 40, 0.5),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      // Should have warnings from the failing placement
      const bootFailWarnings = result.warnings.filter(
        (w) => w.code === 'BOOT_FAIL',
      );
      expect(bootFailWarnings.length).toBeGreaterThan(0);
    });

    it('passes custom marginal config through to compareBOOT', () => {
      // Award $29.50, EA $30.39 => ~3% above
      // Default 5% threshold => marginal. 2% threshold => pass.
      const placement = makePlacement('host-1', 'Builder', 29.50, 1.0);
      const schedule = makePlacementSchedule([placement]);
      const ea = makeEA(30.39);

      const defaultResult = compareGTOBOOT(schedule, ea);
      expect(defaultResult.overallVerdict).toBe('marginal');

      const customResult = compareGTOBOOT(schedule, ea, { marginalThreshold: 0.02 });
      expect(customResult.overallVerdict).toBe('pass');
    });

    it('includes GTO-specific warning for failed placements', () => {
      const placements = [
        makePlacement('host-1', 'Good Builder', 25, 0.5),
        makePlacement('host-2', 'Bad Builder', 40, 0.5),
      ];
      const schedule = makePlacementSchedule(placements);
      const ea = makeEA(30);

      const result = compareGTOBOOT(schedule, ea);

      const gtoFailWarning = result.warnings.find(
        (w) => w.code === 'GTO_PLACEMENT_FAIL',
      );
      expect(gtoFailWarning).toBeDefined();
      expect(gtoFailWarning!.severity).toBe('critical');
      expect(gtoFailWarning!.message).toContain('Bad Builder');
    });
  });
});
