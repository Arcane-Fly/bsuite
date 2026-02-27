import type { AwardSchedule } from '../../../boot/types';

/**
 * Building & Construction General On-site Award 2020 (MA000020)
 *
 * Realistic rates based on 2025/26 Annual Wage Review.
 * 3 classifications: CW/ECW Level 1, Level 2, Level 3.
 */
export const BUILDING_AWARD: AwardSchedule = {
  awardCode: 'MA000020',
  awardName: 'Building and Construction General On-site Award',
  classifications: [
    {
      classificationFixedId: 201,
      name: 'CW/ECW Level 1',
      terms: {
        baseHourlyRate: 29.28,
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
    },
    {
      classificationFixedId: 202,
      name: 'CW/ECW Level 2',
      terms: {
        baseHourlyRate: 30.51,
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
    },
    {
      classificationFixedId: 203,
      name: 'CW/ECW Level 3',
      terms: {
        baseHourlyRate: 32.24,
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
