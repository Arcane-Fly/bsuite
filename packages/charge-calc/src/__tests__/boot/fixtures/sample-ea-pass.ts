import type { EATerms } from '../../../boot/types.js';

/**
 * EA that clearly passes the BOOT (10%+ above award on all terms).
 *
 * - Higher base rates than award for all 3 classifications
 * - All penalty rates match the award (no reductions)
 * - Same allowances as the award
 * - Same super, leave provisions
 */
export const PASSING_EA: EATerms = {
  agreementName: 'ABC Construction Enterprise Agreement 2026',
  lodgementDate: '2026-01-15',
  classifications: [
    {
      id: 'pass-lvl1',
      name: 'Level 1 Operator',
      awardClassificationId: 201,
      terms: {
        baseHourlyRate: 33.00,
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
          {
            name: 'Industry Allowance',
            amount: 0.71,
            frequency: 'perHour',
            isAllPurpose: true,
          },
        ],
        superRate: 0.12,
        leaveLoadingPercent: 17.5,
        annualLeaveDays: 20,
        personalLeaveDays: 10,
        redundancyWeeks: null,
      },
      loadedRate: null,
    },
    {
      id: 'pass-lvl2',
      name: 'Level 2 Operator',
      awardClassificationId: 202,
      terms: {
        baseHourlyRate: 34.50,
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
          {
            name: 'Industry Allowance',
            amount: 0.71,
            frequency: 'perHour',
            isAllPurpose: true,
          },
        ],
        superRate: 0.12,
        leaveLoadingPercent: 17.5,
        annualLeaveDays: 20,
        personalLeaveDays: 10,
        redundancyWeeks: null,
      },
      loadedRate: null,
    },
    {
      id: 'pass-lvl3',
      name: 'Level 3 Operator',
      awardClassificationId: 203,
      terms: {
        baseHourlyRate: 36.00,
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
          {
            name: 'Industry Allowance',
            amount: 0.71,
            frequency: 'perHour',
            isAllPurpose: true,
          },
        ],
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
