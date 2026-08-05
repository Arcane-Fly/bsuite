/**
 * A NON-APPRENTICE must never receive apprentice payroll-tax relief.
 *
 * WHY THIS FILE EXISTS — a money bug found in R80.3 on 2026-08-05, reported by
 * the theme lane, whose whole point is that it is a defect CLASS rather than one
 * bug:
 *
 *   R80.3's `buildEmployeeProfile` routed EVERY worker through
 *   `canonicalRateTypeFromToggles()`, which can only ever return AP (Apprentice)
 *   or AA (Adult Apprentice). Labour-hire casuals, ABN contractors and qualified
 *   skilled workers all went through it. A labour-hire casual with the "Adult"
 *   toggle ticked came out classified AA — Adult Apprentice — and AA is a code
 *   several states grant payroll tax relief to. The engine therefore reduced or
 *   zeroed payroll tax on a worker with no entitlement to it, and the charge
 *   rate came out LOW. Silent under-charge of a host, on a real quote.
 *
 * Nothing caught it because both codes it returned are legal, the profile
 * validated, the calculation ran, and the number looked plausible. The theme
 * lane's diagnosis is the durable part: "No test asserted 'a non-apprentice must
 * NOT receive an apprentice rate code'." A suite that only checks the apprentice
 * happy path is structurally blind to this.
 *
 * THIS PACKAGE IS CURRENTLY CORRECT. Verified by reading, not assumed: no
 * ReliefRule in APPRENTICE_RELIEF lists "AD" or "JN" in its `appliesTo`, and
 * `reliefRuleFor` resolves by positive `.includes(rateTypeCode)`, so an
 * unlisted code falls through to null and the general rate. That is fail-closed
 * and it is the right shape.
 *
 * So this file does not fix anything. It PINS the property, because "correct
 * today with nothing asserting it" is precisely the state R80.3 was in before a
 * later caller widened the path into it. The failure mode is not someone editing
 * these rules — it is someone adding "AD" to an `appliesTo` while extending
 * relief for some genuine new scheme, and nothing objecting.
 *
 * Note the deliberate asymmetry in the last test: the same call with an
 * APPRENTICE code must NOT come back as a plain general-rate result. Without
 * that, every assertion here would still pass against an engine that had lost
 * apprentice relief entirely, and the file would be measuring nothing.
 */
import { describe, expect, it } from "vitest";

import {
  APPRENTICE_RELIEF,
  RELIEF_TYPE,
  reliefRuleFor,
  resolvePayrollTax,
  type AustralianState,
} from "../payroll-tax-relief.js";
import { PAYROLL_TAX_RATES } from "../defaults.js";

const STATES = Object.keys(APPRENTICE_RELIEF) as AustralianState[];

/**
 * Codes for workers who are NOT apprentices or trainees, from the MAPD
 * `employee_rate_type_code` vocabulary in awards/schema.ts. These are exactly
 * the worker types R80.3 was funnelling into the apprentice resolver.
 *
 * XT (Exited Trainee) is deliberately absent: whether a trainee who has exited
 * still attracts relief for the period they were engaged is a question about the
 * scheme rules, not about this defect, and asserting either answer here would be
 * inventing policy.
 */
const NON_APPRENTICE_CODES = ["AD", "JN", "CA"] as const;

describe("payroll tax relief — non-apprentice worker types", () => {
  it("covers every state, so this cannot pass by testing an empty list", () => {
    expect(STATES.length).toBe(8);
  });

  it("no relief rule in ANY state claims a non-apprentice code", () => {
    // Reads the rule table directly. If someone adds "AD" to an appliesTo list,
    // this is the assertion that names the state and the rule.
    for (const state of STATES) {
      for (const rule of APPRENTICE_RELIEF[state]) {
        for (const code of NON_APPRENTICE_CODES) {
          expect(
            rule.appliesTo,
            `${state} relief rule "${rule.type}" claims to apply to ${code}, ` +
              "which is not an apprentice or trainee code. This is how a " +
              "labour-hire worker silently acquires apprentice relief and the " +
              "host is under-charged.",
          ).not.toContain(code);
        }
      }
    }
  });

  it("reliefRuleFor returns null for every non-apprentice code in every state", () => {
    for (const state of STATES) {
      for (const code of NON_APPRENTICE_CODES) {
        expect(reliefRuleFor(state, code), `${state}/${code}`).toBeNull();
      }
    }
  });

  it("resolvePayrollTax charges the GENERAL rate — not zero, not reduced, not an election", () => {
    for (const state of STATES) {
      for (const code of NON_APPRENTICE_CODES) {
        const r = resolvePayrollTax({ state, rateTypeCode: code });
        const where = `${state}/${code}`;

        expect(r.rate, `${where}: rate must be the general rate`).toBe(
          PAYROLL_TAX_RATES[state],
        );
        // `exempt` false is the load-bearing one — a true here is the money bug.
        expect(r.exempt, `${where}: a non-apprentice is never exempt`).toBe(false);
        expect(r.reliefType, `${where}`).toBe(RELIEF_TYPE.NONE);
        expect(r.applied, `${where}: no relief may be recorded as applied`).toEqual([]);
        // An election means "we cannot responsibly produce a figure yet". For a
        // non-apprentice there is no unresolved question: the general rate is
        // simply payable, so blocking a quote here would be a false blocker.
        expect(r.election, `${where}: nothing is pending for a non-apprentice`).toBe(
          false,
        );
        expect(r.pendingConditions, `${where}`).toEqual([]);
      }
    }
  });

  it("an APPRENTICE code is treated differently — proving the assertions above can fail", () => {
    // Without this, every test in the file would still pass against an engine
    // that returned a bare general rate for absolutely everything, i.e. one that
    // had lost apprentice relief completely.
    const differs = STATES.filter((state) => {
      const ap = resolvePayrollTax({ state, rateTypeCode: "AP" });
      const ad = resolvePayrollTax({ state, rateTypeCode: "AD" });
      return (
        ap.reliefType !== ad.reliefType ||
        ap.rate !== ad.rate ||
        ap.election !== ad.election ||
        ap.applied.length !== ad.applied.length ||
        ap.pendingConditions.length !== ad.pendingConditions.length
      );
    });

    expect(
      differs.length,
      "AP and AD resolved identically in every state. Either apprentice relief " +
        "has been lost entirely, or these tests are no longer measuring anything.",
    ).toBeGreaterThan(0);
  });
});
