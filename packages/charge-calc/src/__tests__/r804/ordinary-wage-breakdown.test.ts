/**
 * One derivation, three documents. Operator ruling 2026-08-03.
 *
 * PORTED from R80.4 src/awards/ordinary-wage-breakdown.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory for what that means) — every assertion body
 * is byte-for-byte identical to upstream.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import { ordinaryWageBreakdown, documentFraming, renderBreakdown } from "../../r804/ordinary-wage-breakdown.js";

const t = (n: string, f: () => void) => it(n, f);

// The PACT-reconciled civil bricklayer, 1st year, completed year 12.
const bricklayer = () => ordinaryWageBreakdown({
  baseLabel: "Minimum award wage — stage 1, completed year 12 (55% of standard rate)",
  baseClause: "19.7(b)(i)(A)",
  baseWeekly: 1119.10 * 0.55,
  allPurposeAllowances: [
    { label: "Industry allowance — civil construction", clause: "22.1(a)", perWeek: 67.15 },
    { label: "Tool allowance — bricklayer", clause: "21.1(a)", perWeek: 29.26 },
  ],
});

t("reproduces the PACT figures exactly", () => {
  const b = bricklayer();
  assert.equal(b.ordinaryWeekly, 711.92, "PACT: $711.92/wk");
  assert.equal(b.ordinaryHourly, 18.73, "PACT: $18.73/hr");
});

t("every contributing component is a LINE ITEM with its clause", () => {
  const b = bricklayer();
  assert.equal(b.lines.length, 3, "base + two all-purpose allowances");
  for (const l of b.lines) assert.ok(l.clause, `${l.label} must cite a clause`);
  assert.equal(b.lines.find(l => l.clause === "22.1(a)")!.perHour, 1.77);
  assert.equal(b.lines.find(l => l.clause === "21.1(a)")!.perHour, 0.77);
});

t("the derivation note states what the ordinary wage IS USED FOR", () => {
  const b = bricklayer();
  for (const term of ["overtime", "penalty", "shift loading", "annual leave loading"]) {
    assert.ok(textContains(b.derivationNote, term));
  }
  assert.ok(textContains(b.derivationNote, "not the base wage alone"));
});

t("cl.2's definition is quoted, not paraphrased", () => {
  assert.ok(textContains(bricklayer().authority, "included in the rate of pay"));
  assert.ok(textContains(bricklayer().authority, "penalties or loadings or payment while"));
});

t("the rounding rule is stated — it is load-bearing at the cent", () => {
  assert.ok(textContains(bricklayer().roundingNote, "rounded to the cent BEFORE any multiplier"));
});

t("sums the WEEKLY amounts once — rounding each line first would drift", () => {
  // 615.505 + 67.15 + 29.26 = 711.915 -> 711.92. Rounding the base to 615.51
  // first would give 711.92 too here, but the discipline matters at other rates.
  const b = bricklayer();
  const naive = b.lines.reduce((s, l) => s + (l.perWeek ?? 0), 0);
  assert.ok(Math.abs(naive - b.ordinaryWeekly) < 0.02, "line items must reconcile to the total");
});

t("an apprentice SHARE is shown, not silently folded into the amount", () => {
  const b = ordinaryWageBreakdown({
    baseWeekly: 1119.10 * 0.55,
    allPurposeAllowances: [
      { label: "Lift industry allowance", clause: "42.2(a)", perWeek: 165.63, apprenticeShare: 0.55 },
    ],
  });
  const lift = b.lines.find(l => l.clause === "42.2(a)")!;
  assert.equal(lift.apprenticeShare, 0.55);
  assert.ok(textContains(lift.note!, "55% of the full allowance"));
  assert.equal(lift.perWeek, 91.10, "165.63 x 55%");
});

t("ALL THREE documents share one derivation — same numbers, different framing", () => {
  const b = bricklayer();
  for (const doc of ["quote", "invoice", "payslip"] as const) {
    const out = renderBreakdown(b, doc);
    assert.ok(textContains(out, "ORDINARY WAGE"));
    assert.ok(out.includes("18.73"), `${doc} must show the ordinary hourly rate`);
    assert.ok(out.includes("cl.22.1(a)"), `${doc} must itemise the industry allowance`);
    assert.ok(textContains(out, "overtime, penalty rates"), `${doc} must state what it is used for`);
  }
});

t("each document explains WHY its reader needs the itemisation", () => {
  assert.ok(textContains(documentFraming("payslip").why, "cannot be checked at all"));
  assert.ok(textContains(documentFraming("invoice").why, "checkable against the award"));
  assert.ok(textContains(documentFraming("quote").why, "GENERAL"));
});
