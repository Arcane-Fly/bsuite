/**
 * cl.12 — CASUAL EMPLOYEES, through the shipped engine.
 *
 * PORTED from R80.4 src/awards/casual.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294.
 *
 * ADAPTATIONS (beyond the harness — see round.test.ts in this directory):
 *  1. DROPPED the final block ("The UI must not offer what the engine
 *     refuses"), which reads `charge-calculator-v9-2.tsx` off disk and asserts
 *     UI selector wiring. That file is R80.4's UI, explicitly out of scope for
 *     this port ("Do NOT port R80.4's UI"), and does not exist in this
 *     package. Every assertion that exercises calculate() itself is kept.
 *  2. `ohType: "fixed"` -> `"flat"` and `fundYearSel: "all"` -> `"avg"` in the
 *     local `cfg()` helper. R80.4's own OverheadType is "percent" | "flat" and
 *     YearSelection is number | "avg"; the upstream test file used "fixed" and
 *     "all" which are inert at runtime (only `ohType === "percent"` and
 *     `fundYearSel === "avg"` are ever tested; the funding stub below carries
 *     neither perHourAvg nor perHourByYear, so fundingPH resolves to 0 either
 *     way) but fail the destination package's stricter test-file
 *     type-checking, which R80.4's own `node --test` runner never applies.
 *     No arithmetic changed.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import { calculate } from "../../r804/calculate.js";
import { casualPenaltyMultiplier, CASUAL } from "../../r804/contingent-costs.js";
import { money, round2 } from "../../r804/round.js";
import type { CalcConfig } from "../../r804/calc-types.js";

const t = (n: string, f: () => void) => it(n, f);

const PENS = [
  { id: "ot15", label: "OT first 2h", mult: 1.5, cat: "overtime" as const },
  { id: "ot20", label: "OT after 2h", mult: 2.0, cat: "overtime" as const },
  { id: "ph", label: "Public holiday", mult: 2.5, cat: "penalty" as const },
];
/* engagement defaults to "worker" here because a CASUAL can only be a worker —
   a training contract cannot be casual (operator ruling 2026-08-03). Before the
   guard these tests passed by relying on the "apprentice" default, i.e. they
   asserted the behaviour of an engagement the award does not permit. */
const cfg = (o: Partial<CalcConfig> = {}): CalcConfig => ({
  engagement: "worker",
  wage: 16.49, allowances: [], superRate: 0, wcRate: 0, leaveLoad: 0.175,
  profitType: "markup", profitVal: 0, ohType: "flat", ohVal: 0,
  dpw: 5, alDays: 20, phDays: 10, sickDays: 10, trainWk: 0,
  autoWeeks: true, manualBw: 0, appYears: 4, superOnOT: false,
  empType: "fullTime", workedPW: 38, rdoIncluded: false, rdoAccrual: 0, ptHours: 20,
  funding: { totalFunding: 0 } as CalcConfig["funding"], fundYearSel: "avg", study: 0, ppe: 0, penalties: PENS,
  ...o,
});

t("cl.12.5: the loading is ADDITIVE — 150% becomes 175%, not 187.5%", () => {
  assert.equal(casualPenaltyMultiplier(1.5).multiplier, 1.75);
  assert.notEqual(casualPenaltyMultiplier(1.5).multiplier, 1.875);
  assert.equal(casualPenaltyMultiplier(2.0).multiplier, 2.25);
  assert.notEqual(casualPenaltyMultiplier(2.0).multiplier, 2.5);
});

t("cl.12.6: a public holiday is 275%, not 250% x 1.25 = 312.5%", () => {
  assert.equal(casualPenaltyMultiplier(2.5, true).multiplier, 2.75);
  assert.notEqual(casualPenaltyMultiplier(2.5, true).multiplier, 3.125);
});

t("the engine can now PRICE a casual at all", () => {
  const r = calculate(cfg({ empType: "casual" }));
  assert.equal(r.isCasual, true);
  assert.ok(r.ordinaryHourlyRate! > 0);
});

t("cl.12.4: the ordinary rate carries the 25% loading", () => {
  const perm = calculate(cfg());
  const cas = calculate(cfg({ empType: "casual" }));
  assert.equal(cas.ordinaryHourlyRate, round2(perm.recv * 1.25));
  assert.equal(cas.ordinaryHourlyRate, 20.61);   // 16.49 x 1.25
});

t("penalties apply the ADDITIVE multiplier to the UNLOADED rate", () => {
  const cas = calculate(cfg({ empType: "casual" }));
  // 16.49 x 1.75 = 28.86 — NOT 20.61 x 1.75 (36.07), which would load twice.
  const expected = round2(16.49 * 1.75);
  const otWage = cas.rates.ot15.cost;
  assert.equal(round2(otWage), expected,
    `casual OT should be $${expected} (16.49 x 175%), got ${money(otWage)}`);
  assert.notEqual(round2(otWage), round2(20.61 * 1.75), "the loading is being applied twice");
});

t("cl.12.1/12.4: leave the loading compensates for is NOT costed again", () => {
  const cas = calculate(cfg({ empType: "casual" }));
  assert.equal(cas.alWk, 0, "no annual leave — the loading compensates for it");
  assert.equal(cas.effSickDays, 0);
  assert.equal(cas.effPhDays, 0, "public holidays NOT WORKED are compensated by the loading");
  assert.equal(cas.oncAL, 0);
});

t("a casual therefore has MORE billable weeks than a permanent", () => {
  const perm = calculate(cfg());
  const cas = calculate(cfg({ empType: "casual" }));
  assert.ok(cas.bw > perm.bw, "no leave weeks come out of a casual's year");
  assert.equal(cas.bw, 52);
});

t("cl.12.3: the minimum engagement is 4 hours, cited to the right clause", () => {
  assert.equal(CASUAL.minimumEngagementHours, 4);
  assert.equal(CASUAL.minimumEngagementClause, "12.3");
  assert.equal(CASUAL.loadingClause, "12.4");
});

t("cl.41.3(d): casual service does not accrue redundancy", () => {
  assert.equal(CASUAL.accruesRedundancy, false);
});

/* ── OPERATOR RULING: a training contract can never be casual ─────────────── */

t("an APPRENTICE asked as casual is refused, not silently loaded", () => {
  const r = calculate(cfg({ empType: "casual", engagement: "apprentice" }));
  assert.equal(r.isCasual, false, "the casual treatment must not be applied");
  assert.equal(r.violations!.length, 1);
  assert.ok(textContains(r.violations![0], "cannot be engaged as a CASUAL"));
});

t("...and their leave is NOT stripped by the refusal", () => {
  const r = calculate(cfg({ empType: "casual", engagement: "apprentice" }));
  assert.equal(r.alWk, 4, "annual leave must survive — the loading was never applied");
  assert.equal(r.effPhDays, 10);
});

t("...and they are NOT given the 25% loading they are not entitled to", () => {
  const bad = calculate(cfg({ empType: "casual", engagement: "apprentice" }));
  const good = calculate(cfg({ engagement: "apprentice" }));
  assert.equal(bad.ordinaryHourlyRate, good.ordinaryHourlyRate);
});

t("a TRAINEE is refused on the same basis", () => {
  const r = calculate(cfg({ empType: "casual", engagement: "trainee" }));
  assert.equal(r.isCasual, false);
  assert.equal(r.violations!.length, 1);
});

t("a WORKER as casual is valid — GTOs also operate as labour hire", () => {
  const r = calculate(cfg({ empType: "casual", engagement: "worker" }));
  assert.equal(r.isCasual, true);
  assert.deepEqual(r.violations, []);
  assert.equal(r.ordinaryHourlyRate, 20.61);
});

t("a valid config carries NO violations", () => {
  for (const e of ["apprentice", "trainee", "worker"] as const) {
    for (const t2 of ["fullTime", "partTime"] as const) {
      const r = calculate(cfg({ engagement: e, empType: t2 }));
      assert.deepEqual(r.violations, [], `${e}/${t2} should be valid`);
    }
  }
});
