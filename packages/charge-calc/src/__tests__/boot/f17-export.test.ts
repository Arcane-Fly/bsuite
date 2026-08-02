import { describe, it, expect } from 'vitest';
import { generateF17Data, F17_DISCLAIMER } from '../../boot/f17-export.js';
import type { BOOTResult, EATerms } from '../../boot/types.js';

// ─── Fixtures ───

const makeBOOTResult = (
  verdict: 'pass' | 'fail' | 'marginal',
  classCount = 1,
): BOOTResult => {
  const classResults = Array.from({ length: classCount }, (_, i) => ({
    classificationName: `CW Level ${i + 1}`,
    awardClassificationId: i + 1,
    eaClassificationId: `ea-${i + 1}`,
    scenarios: [
      {
        scenarioType: 'typical' as const,
        scenarioLabel: 'Standard Mon-Fri',
        awardAnnualValue: 50000,
        eaAnnualValue: verdict === 'fail' ? 48000 : 52000,
        difference: verdict === 'fail' ? -2000 : 2000,
        percentDiff: verdict === 'fail' ? -4 : 4,
        verdict: (verdict === 'marginal' ? 'marginal' : verdict) as 'pass' | 'fail' | 'marginal',
        termBreakdown: [
          {
            term: 'basePay',
            awardValue: 45000,
            eaValue: verdict === 'fail' ? 43000 : 47000,
            difference: verdict === 'fail' ? -2000 : 2000,
            percentDiff: verdict === 'fail' ? -4.44 : 4.44,
          },
        ],
      },
    ],
    nonMonetaryDifferences: [
      {
        term: 'Ordinary hours per week',
        awardProvision: '38',
        eaProvision: '38',
        assessment: 'equivalent' as const,
        notes: null,
      },
    ],
    overallVerdict: (verdict === 'marginal' ? 'marginal' : verdict) as 'pass' | 'fail' | 'marginal',
    worstScenario: 'typical' as const,
    bestDelta: verdict === 'fail' ? -2000 : 2000,
    worstDelta: verdict === 'fail' ? -2000 : 2000,
  }));

  const passCount = verdict === 'pass' ? classCount : 0;
  const failCount = verdict === 'fail' ? classCount : 0;
  const marginalCount = verdict === 'marginal' ? classCount : 0;
  const delta = verdict === 'fail' ? -2000 * classCount : 2000 * classCount;

  return {
    overallVerdict: verdict,
    classResults,
    warnings: [],
    humanReviewRequired: true,
    assessedAt: '2024-09-15T10:30:00.000Z',
    engineVersion: '2.0.0',
    summary: {
      totalClasses: classCount,
      passCount,
      failCount,
      marginalCount,
      totalDelta: delta,
    },
  };
};

const makeEA = (classCount = 1): EATerms => ({
  agreementName: 'Test Enterprise Agreement 2024',
  lodgementDate: '2024-09-15',
  classifications: Array.from({ length: classCount }, (_, i) => ({
    id: `ea-${i + 1}`,
    name: `EA Level ${i + 1}`,
    awardClassificationId: i + 1,
    terms: {
      baseHourlyRate: 30,
      casualLoading: 0.25,
      penaltyRates: {
        saturday: 1.5,
        sunday: 2.0,
        publicHoliday: 2.5,
        overtime15x: 1.5,
        overtime2x: 2.0,
        nightShift: null,
        afternoonShift: null,
      },
      allowances: [],
      superRate: 0.12,
      leaveLoadingPercent: 17.5,
      annualLeaveDays: 20,
      personalLeaveDays: 10,
      redundancyWeeks: null,
    },
    loadedRate: null,
  })),
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

// ─── Tests ───

describe('F17 Export Data Structure', () => {
  // 1. Basic F17 generation with a simple pass result
  describe('basic pass result', () => {
    it('generates a complete F17Data structure for a pass verdict', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17).toBeDefined();
      expect(f17.header).toBeDefined();
      expect(f17.classifications).toBeDefined();
      expect(f17.scenarioMatrix).toBeDefined();
      expect(f17.summary).toBeDefined();
      expect(f17.qualitativeAssessment).toBeDefined();
    });

    it('header contains agreementName from EA', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.agreementName).toBe('Test Enterprise Agreement 2024');
    });

    it('header contains lodgementDate from EA', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.lodgementDate).toBe('2024-09-15');
    });

    it('summary overallVerdict is pass', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.summary.overallVerdict).toBe('pass');
      expect(f17.summary.passCount).toBe(1);
      expect(f17.summary.failCount).toBe(0);
    });

    it('classifications contain correct scenario data', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications).toHaveLength(1);
      const cls = f17.classifications[0];
      expect(cls.classificationName).toBe('CW Level 1');
      expect(cls.eaClassificationId).toBe('ea-1');
      expect(cls.awardClassificationId).toBe(1);
      expect(cls.verdict).toBe('pass');
      expect(cls.scenarios).toHaveLength(1);
      expect(cls.scenarios[0].scenarioType).toBe('typical');
      expect(cls.scenarios[0].eaAnnualValue).toBe(52000);
      expect(cls.scenarios[0].awardAnnualValue).toBe(50000);
      expect(cls.scenarios[0].difference).toBe(2000);
    });
  });

  // 2. F17 with a failing result (verify structure completeness)
  describe('fail result', () => {
    it('generates a complete F17Data structure for a fail verdict', () => {
      const bootResult = makeBOOTResult('fail');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.summary.overallVerdict).toBe('fail');
      expect(f17.summary.failCount).toBe(1);
      expect(f17.summary.passCount).toBe(0);
      expect(f17.classifications[0].verdict).toBe('fail');
      expect(f17.classifications[0].scenarios[0].verdict).toBe('fail');
      expect(f17.classifications[0].scenarios[0].difference).toBe(-2000);
    });

    it('includes all structural keys even for failures', () => {
      const bootResult = makeBOOTResult('fail');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      // Verify every top-level key
      expect(f17.header).toHaveProperty('agreementName');
      expect(f17.header).toHaveProperty('lodgementDate');
      expect(f17.header).toHaveProperty('assessedBy');
      expect(f17.header).toHaveProperty('assessedAt');
      expect(f17.header).toHaveProperty('engineVersion');
      expect(f17.header).toHaveProperty('disclaimer');
      expect(f17.classifications).toBeInstanceOf(Array);
      expect(f17.scenarioMatrix).toHaveProperty('rows');
      expect(f17.summary).toHaveProperty('overallVerdict');
      expect(f17.summary).toHaveProperty('totalClasses');
      expect(f17.summary).toHaveProperty('passCount');
      expect(f17.summary).toHaveProperty('failCount');
      expect(f17.summary).toHaveProperty('marginalCount');
      expect(f17.summary).toHaveProperty('totalDelta');
      expect(f17.summary).toHaveProperty('warnings');
      expect(f17.qualitativeAssessment).toHaveProperty('terms');
      expect(f17.qualitativeAssessment).toHaveProperty('notes');
    });
  });

  // 3. Disclaimer is always present and matches F17_DISCLAIMER
  describe('disclaimer', () => {
    it('is always present in the header', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.disclaimer).toBeTruthy();
    });

    it('matches the F17_DISCLAIMER constant exactly', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.disclaimer).toBe(F17_DISCLAIMER);
    });

    it('F17_DISCLAIMER contains Fair Work Act reference', () => {
      expect(F17_DISCLAIMER).toContain('Fair Work Act 2009');
    });

    it('F17_DISCLAIMER warns about decision-support only', () => {
      expect(F17_DISCLAIMER).toContain('decision-support tool only');
    });

    it('F17_DISCLAIMER requires human review', () => {
      expect(F17_DISCLAIMER).toContain('Human review');
    });

    it('disclaimer is consistent across pass, fail, marginal results', () => {
      const ea = makeEA();

      const passF17 = generateF17Data(makeBOOTResult('pass'), ea);
      const failF17 = generateF17Data(makeBOOTResult('fail'), ea);
      const marginalF17 = generateF17Data(makeBOOTResult('marginal'), ea);

      expect(passF17.header.disclaimer).toBe(F17_DISCLAIMER);
      expect(failF17.header.disclaimer).toBe(F17_DISCLAIMER);
      expect(marginalF17.header.disclaimer).toBe(F17_DISCLAIMER);
    });
  });

  // 4. All classifications are included in the output
  describe('all classifications included', () => {
    it('includes 1 classification when bootResult has 1', () => {
      const bootResult = makeBOOTResult('pass', 1);
      const ea = makeEA(1);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications).toHaveLength(1);
    });

    it('includes 3 classifications when bootResult has 3', () => {
      const bootResult = makeBOOTResult('pass', 3);
      const ea = makeEA(3);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications).toHaveLength(3);
      expect(f17.classifications[0].classificationName).toBe('CW Level 1');
      expect(f17.classifications[1].classificationName).toBe('CW Level 2');
      expect(f17.classifications[2].classificationName).toBe('CW Level 3');
    });

    it('preserves classification IDs correctly', () => {
      const bootResult = makeBOOTResult('pass', 2);
      const ea = makeEA(2);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications[0].eaClassificationId).toBe('ea-1');
      expect(f17.classifications[0].awardClassificationId).toBe(1);
      expect(f17.classifications[1].eaClassificationId).toBe('ea-2');
      expect(f17.classifications[1].awardClassificationId).toBe(2);
    });
  });

  // 5. Scenario matrix has correct dimensions
  describe('scenario matrix dimensions', () => {
    it('rows equal number of classifications', () => {
      const bootResult = makeBOOTResult('pass', 3);
      const ea = makeEA(3);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.scenarioMatrix.rows).toHaveLength(3);
    });

    it('each row has correct classification name', () => {
      const bootResult = makeBOOTResult('pass', 2);
      const ea = makeEA(2);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.scenarioMatrix.rows[0].classificationName).toBe('CW Level 1');
      expect(f17.scenarioMatrix.rows[1].classificationName).toBe('CW Level 2');
    });

    it('columns equal number of scenarios per classification', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      // Each classification has 1 scenario ('typical')
      expect(f17.scenarioMatrix.rows[0].scenarios).toHaveLength(1);
      expect(f17.scenarioMatrix.rows[0].scenarios[0].scenarioType).toBe('typical');
    });

    it('matrix scenario entries contain verdict, difference, and percentDiff', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      const entry = f17.scenarioMatrix.rows[0].scenarios[0];
      expect(entry).toHaveProperty('scenarioType');
      expect(entry).toHaveProperty('verdict');
      expect(entry).toHaveProperty('difference');
      expect(entry).toHaveProperty('percentDiff');
    });

    it('matrix with multiple classifications and scenarios has correct shape', () => {
      // Create a BOOTResult with 2 classifications, each having 2 scenarios
      const bootResult: BOOTResult = {
        overallVerdict: 'pass',
        classResults: [
          {
            classificationName: 'CW Level 1',
            awardClassificationId: 1,
            eaClassificationId: 'ea-1',
            scenarios: [
              {
                scenarioType: 'typical',
                scenarioLabel: 'Standard Mon-Fri',
                awardAnnualValue: 50000,
                eaAnnualValue: 52000,
                difference: 2000,
                percentDiff: 4,
                verdict: 'pass',
                termBreakdown: [],
              },
              {
                scenarioType: 'worstCase',
                scenarioLabel: 'Weekend + nights',
                awardAnnualValue: 60000,
                eaAnnualValue: 62000,
                difference: 2000,
                percentDiff: 3.33,
                verdict: 'pass',
                termBreakdown: [],
              },
            ],
            nonMonetaryDifferences: [],
            overallVerdict: 'pass',
            worstScenario: 'worstCase',
            bestDelta: 2000,
            worstDelta: 2000,
          },
          {
            classificationName: 'CW Level 2',
            awardClassificationId: 2,
            eaClassificationId: 'ea-2',
            scenarios: [
              {
                scenarioType: 'typical',
                scenarioLabel: 'Standard Mon-Fri',
                awardAnnualValue: 55000,
                eaAnnualValue: 57000,
                difference: 2000,
                percentDiff: 3.64,
                verdict: 'pass',
                termBreakdown: [],
              },
              {
                scenarioType: 'worstCase',
                scenarioLabel: 'Weekend + nights',
                awardAnnualValue: 65000,
                eaAnnualValue: 67000,
                difference: 2000,
                percentDiff: 3.08,
                verdict: 'pass',
                termBreakdown: [],
              },
            ],
            nonMonetaryDifferences: [],
            overallVerdict: 'pass',
            worstScenario: 'worstCase',
            bestDelta: 2000,
            worstDelta: 2000,
          },
        ],
        warnings: [],
        humanReviewRequired: true,
        assessedAt: '2024-09-15T10:30:00.000Z',
        engineVersion: '2.0.0',
        summary: {
          totalClasses: 2,
          passCount: 2,
          failCount: 0,
          marginalCount: 0,
          totalDelta: 4000,
        },
      };
      const ea = makeEA(2);

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.scenarioMatrix.rows).toHaveLength(2);
      expect(f17.scenarioMatrix.rows[0].scenarios).toHaveLength(2);
      expect(f17.scenarioMatrix.rows[1].scenarios).toHaveLength(2);
    });
  });

  // 6. qualitativeAssessment includes non-monetary terms when present
  describe('qualitative assessment', () => {
    it('includes non-monetary terms from classifications', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.qualitativeAssessment.terms).toContain('Ordinary hours per week');
    });

    it('includes notes from non-monetary differences when present', () => {
      const bootResult: BOOTResult = {
        ...makeBOOTResult('pass'),
        classResults: [
          {
            classificationName: 'CW Level 1',
            awardClassificationId: 1,
            eaClassificationId: 'ea-1',
            scenarios: [],
            nonMonetaryDifferences: [
              {
                term: 'Ordinary hours per week',
                awardProvision: '38',
                eaProvision: '40',
                assessment: 'worse',
                notes: 'EA requires 2 more hours per week',
              },
            ],
            overallVerdict: 'pass',
            worstScenario: null,
            bestDelta: 2000,
            worstDelta: 2000,
          },
        ],
      };
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.qualitativeAssessment.notes).toContain(
        'EA requires 2 more hours per week',
      );
    });

    it('has empty notes array when no non-monetary notes exist', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      // The fixture has notes: null, so notes array should be empty
      expect(f17.qualitativeAssessment.notes).toEqual([]);
    });

    it('deduplicates terms across multiple classifications', () => {
      const bootResult = makeBOOTResult('pass', 2);
      const ea = makeEA(2);

      const f17 = generateF17Data(bootResult, ea);

      // Both classifications have 'Ordinary hours per week', but it should appear only once
      const occurrences = f17.qualitativeAssessment.terms.filter(
        (t) => t === 'Ordinary hours per week',
      );
      expect(occurrences).toHaveLength(1);
    });
  });

  // 7. assessedBy defaults to 'System' when not provided
  describe('assessedBy', () => {
    it('defaults to "System" when not provided', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.assessedBy).toBe('System');
    });

    it('uses the provided assessedBy value', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea, 'John Smith, IR Advisor');

      expect(f17.header.assessedBy).toBe('John Smith, IR Advisor');
    });
  });

  // 8. engineVersion matches the BOOTResult
  describe('engineVersion', () => {
    it('matches the BOOTResult engineVersion', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.engineVersion).toBe('2.0.0');
      expect(f17.header.engineVersion).toBe(bootResult.engineVersion);
    });

    it('assessedAt matches the BOOTResult assessedAt', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.assessedAt).toBe('2024-09-15T10:30:00.000Z');
      expect(f17.header.assessedAt).toBe(bootResult.assessedAt);
    });
  });

  // 9. Empty classResults -> empty classifications array
  describe('empty classResults', () => {
    it('produces empty classifications array', () => {
      const bootResult: BOOTResult = {
        overallVerdict: 'indeterminate',
        classResults: [],
        warnings: [],
        humanReviewRequired: true,
        assessedAt: '2024-09-15T10:30:00.000Z',
        engineVersion: '2.0.0',
        summary: {
          totalClasses: 0,
          passCount: 0,
          failCount: 0,
          marginalCount: 0,
          totalDelta: 0,
        },
      };
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications).toEqual([]);
      expect(f17.scenarioMatrix.rows).toEqual([]);
      expect(f17.summary.totalClasses).toBe(0);
    });

    it('still has complete header with disclaimer', () => {
      const bootResult: BOOTResult = {
        overallVerdict: 'indeterminate',
        classResults: [],
        warnings: [],
        humanReviewRequired: true,
        assessedAt: '2024-09-15T10:30:00.000Z',
        engineVersion: '2.0.0',
        summary: {
          totalClasses: 0,
          passCount: 0,
          failCount: 0,
          marginalCount: 0,
          totalDelta: 0,
        },
      };
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.header.disclaimer).toBe(F17_DISCLAIMER);
      expect(f17.header.agreementName).toBe('Test Enterprise Agreement 2024');
      expect(f17.header.assessedBy).toBe('System');
    });

    it('has empty qualitative assessment', () => {
      const bootResult: BOOTResult = {
        overallVerdict: 'indeterminate',
        classResults: [],
        warnings: [],
        humanReviewRequired: true,
        assessedAt: '2024-09-15T10:30:00.000Z',
        engineVersion: '2.0.0',
        summary: {
          totalClasses: 0,
          passCount: 0,
          failCount: 0,
          marginalCount: 0,
          totalDelta: 0,
        },
      };
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.qualitativeAssessment.terms).toEqual([]);
      expect(f17.qualitativeAssessment.notes).toEqual([]);
    });
  });

  // Additional: warnings are passed through to summary
  describe('warnings in summary', () => {
    it('includes warnings from the BOOTResult', () => {
      const bootResult: BOOTResult = {
        ...makeBOOTResult('fail'),
        warnings: [
          {
            code: 'BOOT_FAIL',
            message: 'Classification fails BOOT',
            severity: 'critical',
          },
          {
            code: 'NON_MONETARY_DETRIMENT',
            message: 'Non-monetary detriment detected',
            severity: 'warning',
          },
        ],
      };
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.summary.warnings).toHaveLength(2);
      expect(f17.summary.warnings[0].code).toBe('BOOT_FAIL');
      expect(f17.summary.warnings[1].code).toBe('NON_MONETARY_DETRIMENT');
    });

    it('has empty warnings array when no warnings', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.summary.warnings).toEqual([]);
    });
  });

  // Additional: term breakdown is preserved in classification sheets
  describe('term breakdown', () => {
    it('preserves termBreakdown in scenario data', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      const scenario = f17.classifications[0].scenarios[0];
      expect(scenario.termBreakdown).toHaveLength(1);
      expect(scenario.termBreakdown[0].term).toBe('basePay');
      expect(scenario.termBreakdown[0].awardValue).toBe(45000);
      expect(scenario.termBreakdown[0].eaValue).toBe(47000);
    });
  });

  // Additional: non-monetary differences are preserved in classification sheets
  describe('non-monetary differences in classifications', () => {
    it('includes nonMonetaryDifferences per classification', () => {
      const bootResult = makeBOOTResult('pass');
      const ea = makeEA();

      const f17 = generateF17Data(bootResult, ea);

      expect(f17.classifications[0].nonMonetaryDifferences).toHaveLength(1);
      expect(f17.classifications[0].nonMonetaryDifferences[0].term).toBe(
        'Ordinary hours per week',
      );
      expect(f17.classifications[0].nonMonetaryDifferences[0].assessment).toBe(
        'equivalent',
      );
    });
  });
});
