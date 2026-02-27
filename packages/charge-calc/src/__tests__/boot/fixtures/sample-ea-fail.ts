import type { EATerms } from '../../../boot/types';

/**
 * EA that fails the BOOT: higher base but NO penalty rates.
 *
 * This is the #1 failure pattern in FWC BOOT assessments.
 * The employer offers a slightly higher base rate but removes all penalty
 * rates. This fails on any scenario with weekend/shift/holiday hours because
 * the award's penalty multipliers far outweigh the small base increase.
 */
export const FAILING_EA: EATerms = {
  agreementName: 'XYZ Builders Enterprise Agreement 2026',
  lodgementDate: '2026-02-01',
  classifications: [
    {
      id: 'fail-lvl1',
      name: 'Level 1 Worker',
      awardClassificationId: 201,
      terms: {
        baseHourlyRate: 32.00,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: null,
          sunday: null,
          publicHoliday: null,
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
    },
    {
      id: 'fail-lvl2',
      name: 'Level 2 Worker',
      awardClassificationId: 202,
      terms: {
        baseHourlyRate: 33.00,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: null,
          sunday: null,
          publicHoliday: null,
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
    },
    {
      id: 'fail-lvl3',
      name: 'Level 3 Worker',
      awardClassificationId: 203,
      terms: {
        baseHourlyRate: 34.50,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: null,
          sunday: null,
          publicHoliday: null,
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
    },
  ],
  nonMonetary: {
    ordinaryHoursPerWeek: 38,
    maxDailyOrdinaryHours: 7.6,
    spanOfHours: { start: '06:00', end: '18:00' },
    rosteringNotice: '7 days',
    minimumEngagementHours: 4,
    mealBreakAfterHours: 5,
    restBreakMinutes: 10,
    consultationObligations: 'As per NES',
    disputeResolution: 'Internal then FWC',
    noticeOfTermination: '1-4 weeks based on service',
  },
};
