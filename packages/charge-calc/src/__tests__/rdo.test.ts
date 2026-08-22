/**
 * RDO (Rostered Day Off) worked-vs-paid modelling.
 *
 * Source of truth: docs/references/20260730-rdo-flexibility-v1.00W.md. MA000020
 * cl.16.2: 8h worked / 7.6h paid / 0.4h banked per day, 19-worked-day cycle.
 * Coverage required by the RDO deliverable brief:
 *   1. no-RDO (worked == paid)
 *   2. the three documented patterns (8/7.6/0.4, 10/9.5/0.5, 12/11.4/0.6)
 *   3. a full 19-day cycle accruing one RDO
 *   4. an RDO taken being billable
 *   5. the boundary where a short engagement never completes a cycle
 */
import { describe, it, expect } from 'vitest';

import { DEFAULT_RDO_CONFIG } from '../types.js';
import type { RdoAccrualConfig } from '../types.js';
import {
  workedHoursPerDayFromPaid,
  paidHoursPerDayFromWorked,
  workedHoursPerWeekFromPaid,
  paidHoursPerWeekFromWorked,
  deriveRdoAccrual,
  billableHoursForRdoDayTaken,
} from '../rdo.js';

// The three patterns documented in rdo-flexibility.md, each on the
// standard 19-worked-day cycle.
const PATTERNS: Array<{ label: string; worked: number; paid: number; accrual: number }> = [
  { label: 'Standard (8h)', worked: 8, paid: 7.6, accrual: 0.4 },
  { label: '10-hour shift', worked: 10, paid: 9.5, accrual: 0.5 },
  { label: '12-hour shift', worked: 12, paid: 11.4, accrual: 0.6 },
];

function rdoFor(accrual: number, cycleDays = 19): RdoAccrualConfig {
  return { enabled: true, accrualHoursPerDay: accrual, cycleDays };
}

describe('1. no-RDO — worked equals paid', () => {
  it('DEFAULT_RDO_CONFIG is disabled', () => {
    expect(DEFAULT_RDO_CONFIG.enabled).toBe(false);
  });

  it('workedHoursPerDayFromPaid is identity when disabled', () => {
    expect(workedHoursPerDayFromPaid(38 / 5, DEFAULT_RDO_CONFIG)).toBeCloseTo(38 / 5, 10);
  });

  it('paidHoursPerDayFromWorked is identity when disabled', () => {
    expect(paidHoursPerDayFromWorked(7.6, DEFAULT_RDO_CONFIG)).toBeCloseTo(7.6, 10);
  });

  it('defaults to DEFAULT_RDO_CONFIG when no rdo argument is supplied at all', () => {
    expect(workedHoursPerDayFromPaid(7.6)).toBeCloseTo(7.6, 10);
    expect(paidHoursPerDayFromWorked(8)).toBeCloseTo(8, 10);
  });

  it('a straight 38-hour week (work 38h, paid 38h) round-trips with no RDO', () => {
    const rdo = DEFAULT_RDO_CONFIG;
    const workedPerWeek = workedHoursPerWeekFromPaid(38 / 5, 5, rdo);
    const paidPerWeek = paidHoursPerWeekFromWorked(workedPerWeek / 5, 5, rdo);
    expect(workedPerWeek).toBeCloseTo(38, 10);
    expect(paidPerWeek).toBeCloseTo(38, 10);
  });

  it('an rdo config with a nonzero accrualHoursPerDay but enabled:false still behaves as no-RDO', () => {
    // Guards against a caller leaving stale accrual figures around after
    // toggling an arrangement off — `enabled` is the single source of truth.
    const rdo: RdoAccrualConfig = { enabled: false, accrualHoursPerDay: 0.4, cycleDays: 19 };
    expect(workedHoursPerDayFromPaid(7.6, rdo)).toBe(7.6);
    expect(paidHoursPerDayFromWorked(8, rdo)).toBe(8);
  });
});

describe('2. the three documented RDO patterns', () => {
  for (const p of PATTERNS) {
    describe(p.label, () => {
      it('worked hours/day derives from paid hours/day', () => {
        expect(workedHoursPerDayFromPaid(p.paid, rdoFor(p.accrual))).toBeCloseTo(p.worked, 10);
      });

      it('paid hours/day derives from worked hours/day', () => {
        expect(paidHoursPerDayFromWorked(p.worked, rdoFor(p.accrual))).toBeCloseTo(p.paid, 10);
      });

      it('round-trips: paid -> worked -> paid recovers the original figure', () => {
        const rdo = rdoFor(p.accrual);
        const worked = workedHoursPerDayFromPaid(p.paid, rdo);
        const paidAgain = paidHoursPerDayFromWorked(worked, rdo);
        expect(paidAgain).toBeCloseTo(p.paid, 10);
      });

      it('a 5-day week: 40h/38h-style totals scale correctly', () => {
        const rdo = rdoFor(p.accrual);
        const workedWeek = workedHoursPerWeekFromPaid(p.paid, 5, rdo);
        const paidWeek = paidHoursPerWeekFromWorked(p.worked, 5, rdo);
        expect(workedWeek).toBeCloseTo(p.worked * 5, 10);
        expect(paidWeek).toBeCloseTo(p.paid * 5, 10);
      });
    });
  }

  it('the standard pattern matches the annual worked/paid/banked figures in the reference doc', () => {
    // rdo-flexibility.md: 40h/week worked x 52 = 2,080; 38h/week paid x 52 = 1,976;
    // 2h/week banked x 52 = 104.
    const rdo = rdoFor(0.4);
    const workedPerWeek = workedHoursPerWeekFromPaid(7.6, 5, rdo);
    const paidPerWeek = paidHoursPerWeekFromWorked(8, 5, rdo);
    expect(workedPerWeek * 52).toBeCloseTo(2080, 6);
    expect(paidPerWeek * 52).toBeCloseTo(1976, 6);
    expect((workedPerWeek - paidPerWeek) * 52).toBeCloseTo(104, 6);
  });

  it('paidHoursPerDayFromWorked throws if accrual would exceed worked hours (misconfiguration guard)', () => {
    expect(() => paidHoursPerDayFromWorked(0.3, rdoFor(0.4))).toThrow();
  });
});

describe('3. a full 19-day cycle accrues one RDO', () => {
  for (const p of PATTERNS) {
    it(`${p.label}: 19 days worked banks exactly one paid day (${p.paid}h)`, () => {
      const result = deriveRdoAccrual(19, rdoFor(p.accrual, 19));
      expect(result.bankedHours).toBeCloseTo(p.paid, 10);
      expect(result.cyclesCompleted).toBe(1);
      expect(result.cycleCompleted).toBe(true);
    });
  }

  it('two full cycles (38 days) bank two RDO days', () => {
    const result = deriveRdoAccrual(38, rdoFor(0.4, 19));
    expect(result.bankedHours).toBeCloseTo(15.2, 10); // 2 x 7.6
    expect(result.cyclesCompleted).toBe(2);
    expect(result.cycleCompleted).toBe(true);
  });

  it('accrual is 0 when the arrangement is disabled, regardless of days worked', () => {
    const result = deriveRdoAccrual(19, { enabled: false, accrualHoursPerDay: 0.4, cycleDays: 19 });
    expect(result.bankedHours).toBe(0);
    expect(result.cyclesCompleted).toBe(0);
    expect(result.cycleCompleted).toBe(false);
  });
});

describe('4. an RDO taken is billable', () => {
  for (const p of PATTERNS) {
    it(`${p.label}: an RDO day taken bills at the WORKED hours figure (${p.worked}h), not the paid figure`, () => {
      expect(billableHoursForRdoDayTaken(p.worked)).toBe(p.worked);
      expect(billableHoursForRdoDayTaken(p.worked)).not.toBe(p.paid);
    });
  }

  it('matches the reference doc: worker works 40h/week, host billed 40h/week (RDO week included)', () => {
    // The week an RDO is taken, the day itself bills at the normal worked
    // day figure — the host is billed for the worker's normal roster,
    // RDO days included, not a discounted "day off" figure.
    const standardWorkedDay = 8;
    expect(billableHoursForRdoDayTaken(standardWorkedDay)).toBe(8);
  });
});

describe('5. short engagement — RDO cycle never completes', () => {
  it('cl.16.8: a project too short for a 19-day cycle reports cycleCompleted: false', () => {
    // e.g. an 8-week (~15 ordinary working day) project — RDOs may be
    // impractical per cl.16.8, but hours still bank pro-rata.
    const result = deriveRdoAccrual(15, rdoFor(0.4, 19));
    expect(result.cyclesCompleted).toBe(0);
    expect(result.cycleCompleted).toBe(false);
    // Banking is NOT all-or-nothing: partial accrual still accumulates
    // even though no full RDO day has become available to take.
    expect(result.bankedHours).toBeCloseTo(6, 10); // 15 x 0.4
    expect(result.bankedHours).toBeLessThan(7.6); // less than one full paid day
  });

  it('exactly one day short of a cycle (18 days) still reports incomplete', () => {
    const result = deriveRdoAccrual(18, rdoFor(0.4, 19));
    expect(result.cyclesCompleted).toBe(0);
    expect(result.cycleCompleted).toBe(false);
    expect(result.bankedHours).toBeCloseTo(7.2, 10);
  });

  it('0 days worked (not yet started) accrues nothing and completes nothing', () => {
    const result = deriveRdoAccrual(0, rdoFor(0.4, 19));
    expect(result).toEqual({ bankedHours: 0, cyclesCompleted: 0, cycleCompleted: false });
  });

  it('negative days worked (defensive) behaves like zero, not a crash', () => {
    const result = deriveRdoAccrual(-3, rdoFor(0.4, 19));
    expect(result.bankedHours).toBe(0);
    expect(result.cycleCompleted).toBe(false);
  });
});
