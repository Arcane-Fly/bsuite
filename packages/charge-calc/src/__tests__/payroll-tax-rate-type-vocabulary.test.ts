/**
 * The rate-type vocabulary must let a caller name a qualified adult worker.
 *
 * WHY THIS EXISTS, AND WHY THE EXISTING TEST WAS NOT ENOUGH.
 *
 * This package already has payroll-tax-relief-non-apprentice.test.ts, which
 * pins the relief TABLE as fail-closed: no rule in any state claims AD, JN or
 * CA, so an unlisted code falls through to the general rate. That test is
 * correct and it stays.
 *
 * It could never have caught the money bug the R80.4 lane found on 2026-08-06,
 * and the lane said so, and they were right:
 *
 *   A labour-hire worker with the Adult cohort selected resolved to "AA" —
 *   Adult Apprentice. Measured in WA, above threshold, conditions confirmed:
 *
 *     AA (what the caller sent)      0.00%   exempt
 *     AP (the fallback default)      0.00%   exempt
 *     AD (correct for a worker)      5.50%   not exempt
 *
 *   A silent 5.5%-of-wages under-charge of the host. Nothing failed. Both
 *   codes are legal and the resulting number is plausible.
 *
 * THE TABLE STAYED FAIL-CLOSED THROUGHOUT AND THE HOST WAS STILL UNDER-CHARGED.
 * The defect was in the CALLER, which handed the table AA. Pinning the table
 * does not pin the caller — a lesson worth more than the fix.
 *
 * WHAT ACTUALLY MADE THE BUG EASY TO WRITE was the type. Two unions in this
 * package described payroll-tax rate types and neither named AD:
 *
 *   defaults.ts            'AP' | 'AA' | 'TN' | 'JN'          closed, no AD
 *   payroll-tax-relief.ts  "AP" | "AA" | "TN" | (string & {}) open, no AD
 *
 * The first omitted the right answer, so a caller holding a qualified adult
 * worker could not express one and had to pick something wrong — and every
 * option it offered attracts relief somewhere. The second accepted anything,
 * so the compiler had no opinion about which wrong thing they picked. A type
 * that omits the correct value and accepts every incorrect one is not neutral;
 * it is the pressure that produces the bug.
 *
 * Both now alias the canonical MAPD vocabulary in awards/schema.ts, which has
 * carried AD all along. This file pins that property so the union cannot
 * quietly narrow again.
 *
 * A NOTE ON THE TWO REPORTS THAT CROSSED HERE. The theme lane said the package
 * "already carries" AD; the R80.4 lane said it does not, citing
 * `grep -rn "'AD'" packages/charge-calc/src/*.ts` returning nothing. The theme
 * lane was right — that glob is top-level only and does not recurse into
 * src/awards/, where AD lives. But R80.4's diagnosis was right anyway: the
 * PAYROLL-TAX unions specifically did not name it, which is the half that
 * mattered.
 */
import { describe, expect, it } from "vitest";

import { EmployeeRateTypeCodeZ } from "../awards/schema.js";
import { APPRENTICE_RELIEF, resolvePayrollTax, type RateTypeCode } from "../payroll-tax-relief.js";
import { PAYROLL_TAX_RATES, type PayrollTaxRateTypeCode } from "../defaults.js";

/** Every code a caller could legitimately be holding. */
const ALL_CODES = EmployeeRateTypeCodeZ.options;

describe("the payroll-tax vocabulary can name every worker a caller might hold", () => {
  it("includes AD — a caller with a qualified adult worker can say so", () => {
    // The omission that forced R80.4's caller to send AA for a labour-hire
    // worker. Without AD in the union there is no correct value to pass.
    expect(ALL_CODES).toContain("AD");
  });

  it("both payroll-tax types accept AD, so neither forces a wrong code", () => {
    // Compile-time assertions. If either union narrows to exclude AD again,
    // this file stops compiling — which is the point. A runtime check could
    // not catch a type regression.
    const forRelief: RateTypeCode = "AD";
    const forDefaults: PayrollTaxRateTypeCode = "AD";
    expect(forRelief).toBe("AD");
    expect(forDefaults).toBe("AD");
  });

  it("the relief type is CLOSED — a wrong code is a compile error, not a silent pass", () => {
    // `RateTypeCode` used to carry `(string & {})`, which accepted any string.
    // That escape hatch is why a caller could pass anything and the compiler
    // had no opinion. Closing it is what surfaced R80.4's loose call site.
    //
    // @ts-expect-error — 'NOT_A_CODE' must not be assignable. If this line
    // stops erroring, the union has been re-opened and the compiler has again
    // stopped catching wrong codes.
    const bad: RateTypeCode = "NOT_A_CODE";
    expect(bad).toBe("NOT_A_CODE");
  });
});

describe("the caller-side property the table test could not cover", () => {
  it("AD is taxed where AP and AA are relieved — so the code a caller picks decides the money", () => {
    // This is R80.4's measurement, reproduced against this package. It is the
    // whole reason the vocabulary matters: these three codes are not
    // interchangeable, and picking the wrong one is not a cosmetic error.
    const conditions = {
      wa_contract_registered: true,
      wa_contract_not_suspended: true,
      registered_training_contract: true,
    };
    const ap = resolvePayrollTax({ state: "WA", rateTypeCode: "AP", confirmedConditions: conditions });
    const aa = resolvePayrollTax({ state: "WA", rateTypeCode: "AA", confirmedConditions: conditions });
    const ad = resolvePayrollTax({ state: "WA", rateTypeCode: "AD", confirmedConditions: conditions });

    // The apprentice codes attract relief; the worker code does not.
    expect(ad.rate, "a qualified adult worker pays the general WA rate").toBe(
      PAYROLL_TAX_RATES.WA,
    );
    expect(ad.exempt, "a qualified adult worker is never exempt").toBe(false);

    // And the gap is real money, not a rounding difference.
    const gap = ad.rate - Math.min(ap.rate, aa.rate);
    expect(
      gap,
      "AD must cost strictly more than the apprentice codes in WA — if this " +
        "reaches zero, either WA relief changed or a rule has started claiming AD, " +
        "and a labour-hire worker is being under-charged again.",
    ).toBeGreaterThan(0);
  });

  it("no relief rule in any state claims a NON-APPRENTICE code", () => {
    // Overlaps the sibling table test deliberately. That file guards the table
    // in isolation; this one guards it as the thing the vocabulary hands codes
    // to, so a future change that widens BOTH together still trips one of them.
    const nonApprentice = ["AD", "JN", "CA"] as const;
    for (const state of Object.keys(APPRENTICE_RELIEF) as Array<keyof typeof APPRENTICE_RELIEF>) {
      for (const rule of APPRENTICE_RELIEF[state]) {
        for (const code of nonApprentice) {
          expect(
            rule.appliesTo,
            `${state} rule "${rule.type}" claims ${code}, a non-apprentice code`,
          ).not.toContain(code);
        }
      }
    }
  });

  it("every code in the vocabulary resolves to a rate — none silently yields undefined", () => {
    // Widening the union means the relief engine now sees codes it never saw
    // before (XT, CA). A code that produced `undefined` here would surface as
    // a blank or NaN charge line rather than an error.
    for (const code of ALL_CODES) {
      const r = resolvePayrollTax({ state: "WA", rateTypeCode: code });
      expect(typeof r.rate, `${code} produced a non-numeric rate`).toBe("number");
      expect(Number.isFinite(r.rate), `${code} produced a non-finite rate`).toBe(true);
    }
  });
});
