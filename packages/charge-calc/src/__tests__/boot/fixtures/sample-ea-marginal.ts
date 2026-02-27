import type { EATerms } from '../../../boot/types';

/**
 * EA that passes the BOOT marginally (within 5% threshold).
 *
 * The slightly higher base rates mostly-but-barely offset:
 * - Reduced Saturday penalty (1.4x vs award 1.5x)
 * - Reduced Sunday penalty (1.9x vs award 2.0x)
 * - No night shift loading (null vs award 1.3x)
 * - No afternoon shift loading (null vs award 1.15x)
 * - No allowances (award has Industry Allowance of $0.71/hr)
 *
 * Typical scenario: ~4% above award (marginal)
 * Worst case scenario: ~0.8% above award (marginal)
 */
export const MARGINAL_EA: EATerms = {
  agreementName: 'DEF Building Services Enterprise Agreement 2026',
  lodgementDate: '2026-01-20',
  classifications: [
    {
      id: 'marg-lvl1',
      name: 'Level 1 Tradesperson',
      awardClassificationId: 201,
      terms: {
        baseHourlyRate: 31.20,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: 1.4,
          sunday: 1.9,
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
    },
    {
      id: 'marg-lvl2',
      name: 'Level 2 Tradesperson',
      awardClassificationId: 202,
      terms: {
        baseHourlyRate: 32.50,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: 1.4,
          sunday: 1.9,
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
    },
    {
      id: 'marg-lvl3',
      name: 'Level 3 Tradesperson',
      awardClassificationId: 203,
      terms: {
        baseHourlyRate: 34.30,
        casualLoading: 0.25,
        penaltyRates: {
          saturday: 1.4,
          sunday: 1.9,
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
