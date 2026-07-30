/**
 * Overtime carries only the oncosts levied on total wages.
 *
 * `otOncostFactor` was a hardcoded `0.12` whose entire documentation was the
 * circular comment "OT oncost factor (default 0.12)". Git history shows it was
 * inherited when magic constants were extracted, never derived from anything.
 *
 * The oncosts overtime actually attracts are workers' compensation premium and
 * payroll tax — both levied on total wages. It carries none of the
 * per-ordinary-hour costs (annual leave, leave loading, sick leave, public
 * holidays, off-the-job training, study, PPE): an overtime hour accrues no
 * leave and consumes no training time. Superannuation is excluded separately
 * and correctly by `superOnOT` (defaults false) because overtime is not
 * ordinary time earnings — SGAA 1992 s.6(1), ATO SGR 2009/2.
 *
 * 0.047 + 0.0485 = 0.0955. The old 0.12 over-applied oncosts to overtime by
 * 2.45 percentage points of pay, on every overtime hour of every quote.
 */

import { describe, it, expect } from 'vitest';

import { calculate } from '../calculate';
import { DEFAULT_CONFIG, deriveOtOncostFactor } from '../defaults';

describe('deriveOtOncostFactor', () => {
  it('is workers comp + payroll tax, nothing else', () => {
    expect(deriveOtOncostFactor({ wcRate: 0.047, payrollTaxRate: 0.0485 })).toBeCloseTo(
      0.0955,
      10,
    );
  });

  it('does NOT include superannuation', () => {
    // The single most likely wrong answer. Super is not payable on overtime;
    // if this ever starts matching wc + ptax + super, someone has folded it in.
    const derived = deriveOtOncostFactor({ wcRate: 0.047, payrollTaxRate: 0.0485 });
    expect(derived).not.toBeCloseTo(0.047 + 0.0485 + 0.12, 4);
  });

  it('tracks the rates it is derived from', () => {
    // Payroll tax ranges 0% (under threshold) to ~6.85% by state. A fixed
    // factor is wrong for most tenants; this must move with the inputs.
    expect(deriveOtOncostFactor({ wcRate: 0.03, payrollTaxRate: 0 })).toBeCloseTo(0.03, 10);
    expect(deriveOtOncostFactor({ wcRate: 0.055, payrollTaxRate: 0.0685 })).toBeCloseTo(
      0.1235,
      10,
    );
  });

  it('is what DEFAULT_CONFIG actually uses — no drift between the two', () => {
    expect(DEFAULT_CONFIG.otOncostFactor).toBeCloseTo(
      deriveOtOncostFactor({
        wcRate: DEFAULT_CONFIG.wcRate,
        payrollTaxRate: DEFAULT_CONFIG.payrollTaxRate,
      }),
      10,
    );
  });

  it('is NOT the old magic 0.12', () => {
    // The regression guard. If someone restores the constant, this fails.
    expect(DEFAULT_CONFIG.otOncostFactor).not.toBeCloseTo(0.12, 4);
  });
});

describe('output equivalence — what deriving the factor moves', () => {
  const cfg = { ...DEFAULT_CONFIG, payRate: 30 };

  it('changes ONLY overtime rates, never ordinary or penalty', () => {
    const before = calculate({ ...cfg, otOncostFactor: 0.12 });
    const after = calculate(cfg);

    const overtimeIds = new Set(
      DEFAULT_CONFIG.penalties.filter((p) => p.cat === 'overtime').map((p) => p.id),
    );

    for (const [id, rate] of Object.entries(after.rates)) {
      const prior = before.rates[id];
      if (!prior) continue;
      if (overtimeIds.has(id)) {
        // Overtime must have moved DOWN — we were over-applying oncosts.
        expect(rate.charge).toBeLessThan(prior.charge);
      } else {
        // Everything else must be untouched. If ordinary or penalty rates
        // moved, the change leaked beyond its intended scope.
        expect(rate.charge).toBeCloseTo(prior.charge, 10);
      }
    }
  });

  it('moves overtime by the rate delta times the multiplier, and nothing more', () => {
    const before = calculate({ ...cfg, otOncostFactor: 0.12 });
    const after = calculate(cfg);

    // ot15 is Time & a Half. The per-hour oncost delta scales with the
    // multiplier because the whole 1x charge is multiplied.
    const deltaAt1x =
      (before.rates['ot15']!.charge - after.rates['ot15']!.charge) / 1.5;
    const deltaAt2x =
      (before.rates['ot20']!.charge - after.rates['ot20']!.charge) / 2.0;

    // The same underlying per-hour figure, whichever multiplier you divide out.
    expect(deltaAt1x).toBeCloseTo(deltaAt2x, 8);
    expect(deltaAt1x).toBeGreaterThan(0);
  });
});
