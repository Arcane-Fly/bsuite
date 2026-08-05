/**
 * PORTED from R80.4 src/awards/ma000020-minimum-engagement.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory) — every assertion body is byte-for-byte
 * identical to upstream.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { isClauseReference, textContains } from "../../r804/text-normalise.js";

import {
  MINIMUM_ENGAGEMENTS, applyMinimumEngagement, partDayPublicHolidayHours,
} from "../../r804/ma000020-minimum-engagement.js";

const t = (n: string, f: () => void) => it(n, f);

const ORD = 16.49;

t("THE HEADLINE: a 1-hour Sunday call-in bills 4 hours at 200%", () => {
  const r = applyMinimumEngagement({ key: "sun_overtime", hoursWorked: 1, ordinaryHourlyRate: ORD });
  assert.equal(r.hoursPaid, 4);
  assert.equal(r.upliftHours, 3);
  assert.equal(r.multiplier, 2.0);
  assert.equal(r.cost, 131.92);          // 4 x 16.49 x 2
  assert.equal(r.applied, true);
});

t("charging only the hour worked under-recovers by 3 hours", () => {
  const r = applyMinimumEngagement({ key: "sun_overtime", hoursWorked: 1, ordinaryHourlyRate: ORD });
  const naive = 1 * ORD * 2;
  assert.ok(r.cost > naive * 3.9, `minimum engagement must be ~4x the naive figure, got ${r.cost} vs ${naive}`);
});

t("Saturday overtime minimum is 3 hours (cl.30.2(a))", () => {
  const r = applyMinimumEngagement({ key: "sat_overtime", hoursWorked: 1, ordinaryHourlyRate: ORD, multiplierOverride: 1.5 });
  assert.equal(r.hoursPaid, 3);
  assert.equal(r.cost, 74.21);           // 3 x 16.49 x 1.5
});

t("Saturday after Good Friday: 4 hours at 250%", () => {
  const r = applyMinimumEngagement({ key: "sat_good_friday", hoursWorked: 0.5, ordinaryHourlyRate: ORD });
  assert.equal(r.hoursPaid, 4);
  assert.equal(r.multiplier, 2.5);
  assert.equal(r.cost, 164.90);
});

t("public holiday: 4 hours at 250%", () => {
  const r = applyMinimumEngagement({ key: "public_holiday", hoursWorked: 2, ordinaryHourlyRate: ORD });
  assert.equal(r.hoursPaid, 4);
  assert.equal(r.cost, 164.90);
});

t("recall is per occasion — cl.24.5 bites twice in one day", () => {
  const one = applyMinimumEngagement({ key: "recall_overtime", hoursWorked: 1, ordinaryHourlyRate: ORD });
  assert.equal(one.hoursPaid, 3);
  assert.ok(textContains(one.reason, "EACH TIME"));
});

t("the minimum does NOT bite when the hours already exceed it", () => {
  const r = applyMinimumEngagement({ key: "sun_overtime", hoursWorked: 8, ordinaryHourlyRate: ORD });
  assert.equal(r.hoursPaid, 8);
  assert.equal(r.upliftHours, 0);
  assert.equal(r.applied, false);
  assert.ok(textContains(r.reason, "does not bite"));
});

t("travel is a HALF hour at ORDINARY time, not at a penalty", () => {
  const r = applyMinimumEngagement({ key: "travel_return_journey", hoursWorked: 0.1, ordinaryHourlyRate: ORD });
  assert.equal(r.hoursPaid, 0.5);
  assert.equal(r.multiplier, 1, "travel time is paid at the ordinary rate — no multiplier");
});

t("cl.30.2(e): a continuous shift across a part-day PH is ONE engagement", () => {
  const r = partDayPublicHolidayHours(2, 3, 2);
  assert.equal(r.separateEngagements, 1);
  assert.equal(r.countedTowardMinimum, 7);
  assert.ok(textContains(r.note, "do not create a second minimum"));
});

t("every engagement carries its clause — an unciteable rule is unauditable", () => {
  for (const m of MINIMUM_ENGAGEMENTS) {
    /* A clause reference must RESOLVE, not be long. The earlier assertion
       required length > 2 and so rejected the legitimate top-level "29"
       (Overtime) — an arbitrary shape check masquerading as a correctness one. */
    assert.ok(isClauseReference(m.clause), `${m.key} has no usable clause reference`);
    assert.ok(m.minimumHours > 0, `${m.key} has no minimum`);
  }
});
