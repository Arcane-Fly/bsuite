import { describe, it, expect } from 'vitest';
import {
  EmploymentTypeZ,
  ScenarioTypeZ,
  RosterScenarioZ,
  MonetaryTermsZ,
  NonMonetaryTermsZ,
  EAClassificationZ,
  EATermsZ,
  AwardScheduleZ,
  BOOTVerdictZ,
  TermComparisonZ,
  BOOTScenarioResultZ,
  NonMonetaryDifferenceZ,
  BOOTClassResultZ,
  BOOTWarningZ,
  BOOTResultZ,
  MarginalConfigZ,
  ReconciliationClauseZ,
  DEFAULT_MARGINAL_CONFIG,
  DEFAULT_RECONCILIATION,
  ENGINE_VERSION,
} from '../../boot/types.js';

// ─── EmploymentType ───
describe('EmploymentTypeZ', () => {
  it('accepts all valid employment types', () => {
    expect(EmploymentTypeZ.safeParse('fullTime').success).toBe(true);
    expect(EmploymentTypeZ.safeParse('partTime').success).toBe(true);
    expect(EmploymentTypeZ.safeParse('casual').success).toBe(true);
  });

  it('rejects invalid employment types', () => {
    expect(EmploymentTypeZ.safeParse('contractor').success).toBe(false);
    expect(EmploymentTypeZ.safeParse('').success).toBe(false);
    expect(EmploymentTypeZ.safeParse(123).success).toBe(false);
  });
});

// ─── ScenarioType ───
describe('ScenarioTypeZ', () => {
  it('accepts all valid scenario types', () => {
    const validScenarios = ['typical', 'worstCase', 'casualMinimum', 'peakDemand'] as const;
    for (const s of validScenarios) {
      expect(ScenarioTypeZ.safeParse(s).success).toBe(true);
    }
  });

  it('rejects invalid scenario types', () => {
    expect(ScenarioTypeZ.safeParse('bestCase').success).toBe(false);
    expect(ScenarioTypeZ.safeParse('').success).toBe(false);
  });
});

// ─── RosterScenario ───
describe('RosterScenarioZ', () => {
  const minValid = {
    scenarioType: 'typical',
    label: 'Standard 38hr week',
    employmentType: 'fullTime',
    ordinaryHoursPerWeek: 38,
    weeklyBreakdown: {
      ordinaryDay: 38,
    },
  };

  it('accepts minimal valid roster scenario with defaults', () => {
    const result = RosterScenarioZ.safeParse(minValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeksPerYear).toBe(48);
      expect(result.data.weeklyBreakdown.saturdayOrdinary).toBe(0);
      expect(result.data.weeklyBreakdown.sundayOrdinary).toBe(0);
      expect(result.data.weeklyBreakdown.publicHoliday).toBe(0);
      expect(result.data.weeklyBreakdown.overtime15x).toBe(0);
      expect(result.data.weeklyBreakdown.overtime2x).toBe(0);
      expect(result.data.weeklyBreakdown.nightShift).toBe(0);
      expect(result.data.weeklyBreakdown.afternoonShift).toBe(0);
      expect(result.data.weeklyBreakdown.casualLoading).toBe(0);
    }
  });

  it('accepts a fully specified roster scenario', () => {
    const full = {
      scenarioType: 'worstCase',
      label: 'Maximum penalty exposure',
      employmentType: 'partTime',
      ordinaryHoursPerWeek: 25,
      weeklyBreakdown: {
        ordinaryDay: 15,
        saturdayOrdinary: 4,
        sundayOrdinary: 3,
        publicHoliday: 0.5,
        overtime15x: 2,
        overtime2x: 0.5,
        nightShift: 0,
        afternoonShift: 0,
        casualLoading: 0,
      },
      weeksPerYear: 46,
    };
    const result = RosterScenarioZ.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeksPerYear).toBe(46);
      expect(result.data.weeklyBreakdown.sundayOrdinary).toBe(3);
    }
  });

  it('rejects missing required fields', () => {
    expect(RosterScenarioZ.safeParse({}).success).toBe(false);
    expect(RosterScenarioZ.safeParse({ scenarioType: 'typical' }).success).toBe(false);
  });
});

// ─── MonetaryTerms ───
describe('MonetaryTermsZ', () => {
  const minValid = {
    baseHourlyRate: 29.5,
    penaltyRates: {},
  };

  it('accepts minimal monetary terms with defaults', () => {
    const result = MonetaryTermsZ.safeParse(minValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.casualLoading).toBe(0.25);
      expect(result.data.superRate).toBe(0.12);
      expect(result.data.leaveLoadingPercent).toBe(17.5);
      expect(result.data.annualLeaveDays).toBe(20);
      expect(result.data.personalLeaveDays).toBe(10);
      expect(result.data.redundancyWeeks).toBeNull();
      expect(result.data.allowances).toEqual([]);
      expect(result.data.penaltyRates.saturday).toBeNull();
      expect(result.data.penaltyRates.sunday).toBeNull();
      expect(result.data.penaltyRates.publicHoliday).toBeNull();
      expect(result.data.penaltyRates.overtime15x).toBe(1.5);
      expect(result.data.penaltyRates.overtime2x).toBe(2.0);
      expect(result.data.penaltyRates.nightShift).toBeNull();
      expect(result.data.penaltyRates.afternoonShift).toBeNull();
    }
  });

  it('accepts full monetary terms with allowances', () => {
    const full = {
      baseHourlyRate: 35.0,
      casualLoading: 0.25,
      penaltyRates: {
        saturday: 1.5,
        sunday: 2.0,
        publicHoliday: 2.5,
        overtime15x: 1.5,
        overtime2x: 2.0,
        nightShift: 1.3,
        afternoonShift: 1.15,
      },
      allowances: [
        { name: 'Tool', amount: 25, frequency: 'perWeek', isAllPurpose: true },
        { name: 'Travel', amount: 0.95, frequency: 'perHour', isAllPurpose: false },
      ],
      superRate: 0.12,
      leaveLoadingPercent: 17.5,
      annualLeaveDays: 20,
      personalLeaveDays: 10,
      redundancyWeeks: 8,
    };
    const result = MonetaryTermsZ.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowances).toHaveLength(2);
      expect(result.data.redundancyWeeks).toBe(8);
    }
  });

  it('rejects missing baseHourlyRate', () => {
    expect(MonetaryTermsZ.safeParse({ penaltyRates: {} }).success).toBe(false);
  });

  it('validates allowance frequency enum', () => {
    const withBadAllowance = {
      baseHourlyRate: 30,
      penaltyRates: {},
      allowances: [
        { name: 'X', amount: 5, frequency: 'perMonth', isAllPurpose: false },
      ],
    };
    expect(MonetaryTermsZ.safeParse(withBadAllowance).success).toBe(false);
  });
});

// ─── NonMonetaryTerms ───
describe('NonMonetaryTermsZ', () => {
  it('accepts empty object with all defaults', () => {
    const result = NonMonetaryTermsZ.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ordinaryHoursPerWeek).toBe(38);
      expect(result.data.maxDailyOrdinaryHours).toBeNull();
      expect(result.data.spanOfHours.start).toBe('06:00');
      expect(result.data.spanOfHours.end).toBe('18:00');
      expect(result.data.rosteringNotice).toBeNull();
      expect(result.data.minimumEngagementHours).toBeNull();
      expect(result.data.mealBreakAfterHours).toBeNull();
      expect(result.data.restBreakMinutes).toBeNull();
      expect(result.data.consultationObligations).toBeNull();
      expect(result.data.disputeResolution).toBeNull();
      expect(result.data.noticeOfTermination).toBeNull();
    }
  });

  it('accepts fully specified non-monetary terms', () => {
    const full = {
      ordinaryHoursPerWeek: 36,
      maxDailyOrdinaryHours: 10,
      spanOfHours: { start: '07:00', end: '19:00' },
      rosteringNotice: '7 days',
      minimumEngagementHours: 3,
      mealBreakAfterHours: 5,
      restBreakMinutes: 10,
      consultationObligations: 'As per clause 33',
      disputeResolution: 'Internal then FWC',
      noticeOfTermination: '4 weeks',
    };
    const result = NonMonetaryTermsZ.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ordinaryHoursPerWeek).toBe(36);
      expect(result.data.minimumEngagementHours).toBe(3);
    }
  });
});

// ─── EAClassification ───
describe('EAClassificationZ', () => {
  const minValid = {
    id: 'cls-1',
    name: 'Level 1',
    awardClassificationId: 101,
    terms: {
      baseHourlyRate: 25.0,
      penaltyRates: {},
    },
  };

  it('accepts valid EA classification with defaults', () => {
    const result = EAClassificationZ.safeParse(minValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loadedRate).toBeNull();
    }
  });

  it('accepts EA classification with loaded rate', () => {
    const result = EAClassificationZ.safeParse({
      ...minValid,
      loadedRate: 45.50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loadedRate).toBe(45.50);
    }
  });
});

// ─── EATerms ───
describe('EATermsZ', () => {
  it('accepts valid EA terms', () => {
    const eaTerms = {
      agreementName: 'Test Enterprise Agreement 2024',
      lodgementDate: '2024-06-15',
      classifications: [
        {
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 25.0, penaltyRates: {} },
        },
      ],
    };
    const result = EATermsZ.safeParse(eaTerms);
    expect(result.success).toBe(true);
    if (result.success) {
      // nonMonetary should have defaults
      expect(result.data.nonMonetary.ordinaryHoursPerWeek).toBe(38);
    }
  });

  it('rejects missing agreement name', () => {
    expect(EATermsZ.safeParse({
      lodgementDate: '2024-01-01',
      classifications: [],
    }).success).toBe(false);
  });
});

// ─── AwardSchedule ───
describe('AwardScheduleZ', () => {
  it('accepts valid award schedule', () => {
    const schedule = {
      awardCode: 'MA000020',
      awardName: 'Building and Construction General On-site Award',
      classifications: [
        {
          classificationFixedId: 101,
          name: 'CW/ECW Level 1',
          terms: { baseHourlyRate: 29.50, penaltyRates: {} },
        },
      ],
    };
    const result = AwardScheduleZ.safeParse(schedule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nonMonetary.ordinaryHoursPerWeek).toBe(38);
    }
  });
});

// ─── BOOTVerdict ───
describe('BOOTVerdictZ', () => {
  it('accepts all verdict values', () => {
    for (const v of ['pass', 'fail', 'marginal', 'indeterminate']) {
      expect(BOOTVerdictZ.safeParse(v).success).toBe(true);
    }
  });

  it('rejects invalid verdicts', () => {
    expect(BOOTVerdictZ.safeParse('approved').success).toBe(false);
    expect(BOOTVerdictZ.safeParse('').success).toBe(false);
  });
});

// ─── TermComparison ───
describe('TermComparisonZ', () => {
  it('accepts valid term comparison', () => {
    const result = TermComparisonZ.safeParse({
      term: 'Base Pay',
      awardValue: 53808,
      eaValue: 55000,
      difference: 1192,
      percentDiff: 2.21,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(TermComparisonZ.safeParse({ term: 'Base Pay' }).success).toBe(false);
  });
});

// ─── BOOTScenarioResult ───
describe('BOOTScenarioResultZ', () => {
  it('accepts valid scenario result', () => {
    const result = BOOTScenarioResultZ.safeParse({
      scenarioType: 'typical',
      scenarioLabel: 'Standard 38hr week',
      awardAnnualValue: 61143.82,
      eaAnnualValue: 63000,
      difference: 1856.18,
      percentDiff: 3.04,
      verdict: 'pass',
      termBreakdown: [
        {
          term: 'Base Pay',
          awardValue: 53808,
          eaValue: 55000,
          difference: 1192,
          percentDiff: 2.21,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── NonMonetaryDifference ───
describe('NonMonetaryDifferenceZ', () => {
  it('accepts valid non-monetary difference with all assessment values', () => {
    for (const assessment of ['equivalent', 'better', 'worse', 'different', 'missing'] as const) {
      const result = NonMonetaryDifferenceZ.safeParse({
        term: 'Span of Hours',
        awardProvision: '6:00 to 18:00',
        eaProvision: '5:00 to 20:00',
        assessment,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeNull();
      }
    }
  });

  it('rejects invalid assessment', () => {
    expect(NonMonetaryDifferenceZ.safeParse({
      term: 'X',
      awardProvision: 'a',
      eaProvision: 'b',
      assessment: 'unknown',
    }).success).toBe(false);
  });
});

// ─── BOOTClassResult ───
describe('BOOTClassResultZ', () => {
  it('accepts valid class result', () => {
    const result = BOOTClassResultZ.safeParse({
      classificationName: 'CW/ECW Level 2',
      awardClassificationId: 102,
      eaClassificationId: 'cls-2',
      scenarios: [],
      nonMonetaryDifferences: [],
      overallVerdict: 'pass',
      worstScenario: null,
      bestDelta: 2500,
      worstDelta: 500,
    });
    expect(result.success).toBe(true);
  });
});

// ─── BOOTWarning ───
describe('BOOTWarningZ', () => {
  it('accepts all severity levels', () => {
    for (const severity of ['critical', 'warning', 'info'] as const) {
      const result = BOOTWarningZ.safeParse({
        code: 'W001',
        message: 'Test warning',
        severity,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid severity', () => {
    expect(BOOTWarningZ.safeParse({
      code: 'W001',
      message: 'Test',
      severity: 'fatal',
    }).success).toBe(false);
  });
});

// ─── BOOTResult ───
describe('BOOTResultZ', () => {
  const validResult = {
    overallVerdict: 'pass',
    classResults: [],
    warnings: [],
    humanReviewRequired: true,
    assessedAt: '2026-02-27T10:00:00Z',
    engineVersion: '2.0.0',
    summary: {
      totalClasses: 3,
      passCount: 3,
      failCount: 0,
      marginalCount: 0,
      totalDelta: 5000,
    },
  };

  it('accepts valid BOOT result', () => {
    const result = BOOTResultZ.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('humanReviewRequired MUST be true (z.literal)', () => {
    // Must accept true
    expect(BOOTResultZ.safeParse(validResult).success).toBe(true);

    // Must reject false — this is the red-team L-1 requirement
    expect(BOOTResultZ.safeParse({
      ...validResult,
      humanReviewRequired: false,
    }).success).toBe(false);

    // Must reject undefined/missing
    const { humanReviewRequired: _, ...withoutHR } = validResult;
    expect(BOOTResultZ.safeParse(withoutHR).success).toBe(false);

    // Must reject other truthy values
    expect(BOOTResultZ.safeParse({
      ...validResult,
      humanReviewRequired: 1,
    }).success).toBe(false);

    expect(BOOTResultZ.safeParse({
      ...validResult,
      humanReviewRequired: 'true',
    }).success).toBe(false);
  });

  it('rejects missing summary fields', () => {
    expect(BOOTResultZ.safeParse({
      ...validResult,
      summary: { totalClasses: 1 },
    }).success).toBe(false);
  });
});

// ─── MarginalConfig ───
describe('MarginalConfigZ', () => {
  it('accepts empty object with defaults', () => {
    const result = MarginalConfigZ.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marginalThreshold).toBe(0.05);
      expect(result.data.recommendReconciliation).toBe(true);
    }
  });

  it('accepts custom config', () => {
    const result = MarginalConfigZ.safeParse({
      marginalThreshold: 0.03,
      recommendReconciliation: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marginalThreshold).toBe(0.03);
      expect(result.data.recommendReconciliation).toBe(false);
    }
  });
});

// ─── ReconciliationClause ───
describe('ReconciliationClauseZ', () => {
  it('accepts empty object with defaults', () => {
    const result = ReconciliationClauseZ.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewFrequencyMonths).toBe(6);
      expect(result.data.topUpDeadlineDays).toBe(49);
      expect(result.data.penaltyMultiplier).toBe(1.05);
    }
  });
});

// ─── Constants ───
describe('Constants', () => {
  it('ENGINE_VERSION is exported and is a string', () => {
    expect(typeof ENGINE_VERSION).toBe('string');
    expect(ENGINE_VERSION).toBe('2.0.0');
  });

  it('DEFAULT_MARGINAL_CONFIG has correct values', () => {
    expect(DEFAULT_MARGINAL_CONFIG).toEqual({
      marginalThreshold: 0.05,
      recommendReconciliation: true,
    });
  });

  it('DEFAULT_RECONCILIATION has correct values', () => {
    expect(DEFAULT_RECONCILIATION).toEqual({
      reviewFrequencyMonths: 6,
      topUpDeadlineDays: 49,
      penaltyMultiplier: 1.05,
    });
  });
});
