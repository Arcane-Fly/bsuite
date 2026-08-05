/**
 * Funding tests. Guards the properties that make this model preferred over a
 * scheme dropdown: unlimited custom milestones, conservation of money,
 * year-boundary splitting, per-year divisors, and no silent misattribution.
 *
 * PORTED from R80.4 src/awards/funding.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory) — every assertion body is byte-for-byte
 * identical to upstream.
 *
 * NOT WIRED TO A SEEDED CATALOGUE: EXAMPLE_MILESTONES is illustrative only
 * (operator directive 2026-08-05 — never pre-populate funding/schemes) and
 * this file's own tests assert exactly that ("the example milestones are
 * named EXAMPLE, not DEFAULT").
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import {
  PASS_THROUGH, FUNDING_MODE, EXAMPLE_MILESTONES,
  buildFundingSchedule, auditFundingSchedule, passThroughFactor,
  resolveFundingRate, fundingAppliesToRateCategory, combineFundingSchemes,
} from "../../r804/funding.js";
import type { Milestone, FundingScheme } from "../../r804/funding.js";

const t = (n: string, f: () => void) => it(n, f);

// Declared here, not at the foot of the file: a `const` helper referenced by a
// test that runs before its definition is a TDZ error, and this project has
// already lost time to that exact shape twice.
const round2 = (x: number) => Math.round(x * 100 + 1e-9) / 100;
const round4 = (x: number) => Math.round(x * 10000 + 1e-9) / 10000;

const ms = (...list: Array<Partial<Milestone> & { name: string; amount: number; month: number }>): Milestone[] =>
  list.map((m, i) => ({ id: i + 1, split: false, ...m }));

// ---- unlimited custom milestones -------------------------------------------

t("accepts an arbitrary number of custom milestones", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Custom ${i}`, amount: 100, month: (i % 48) + 1 }));
  const s = buildFundingSchedule(many, 4);
  assert.equal(round2(s.reduce((a, b) => a + b, 0)), 2500, "all 25 custom milestones must be attributed");
});

t("a custom milestone with any name/amount/month is attributed", () => {
  const s = buildFundingSchedule(ms({ name: "WA Jobs Bonus", amount: 1234.56, month: 7 }), 4);
  assert.equal(s[0], 1234.56, "month 7 falls in year 1");
});

t("empty and zero-amount milestones are ignored, not counted", () => {
  const s = buildFundingSchedule(ms({ name: "Nil", amount: 0, month: 6 }, { name: "Real", amount: 500, month: 6 }), 4);
  assert.equal(s[0], 500);
});

t("a malformed custom milestone cannot poison the total", () => {
  const s = buildFundingSchedule(
    [{ name: "bad", amount: NaN, month: 6 } as unknown as Milestone, null as unknown as Milestone,
     undefined as unknown as Milestone, { name: "ok", amount: 300, month: 6 } as unknown as Milestone], 4);
  assert.equal(s[0], 300, "NaN/null entries must be skipped, not propagate");
  assert.ok(s.every(Number.isFinite), "no NaN may reach the schedule");
});

// ---- conservation ----------------------------------------------------------

t("money in equals money out", () => {
  const a = auditFundingSchedule(EXAMPLE_MILESTONES, 4);
  assert.equal(a.declared, 10000);
  assert.equal(a.attributed, 10000);
  assert.equal(a.conserved, true);
});

t("conservation holds with an odd split percentage", () => {
  const a = auditFundingSchedule(ms({ name: "Split", amount: 1000, month: 24, split: true, splitPct: 37 }), 4);
  assert.equal(a.attributed, 1000);
  assert.equal(a.conserved, true);
  assert.equal(a.schedule[1], 370);
  assert.equal(a.schedule[2], 630);
});

// ---- year-boundary splitting -----------------------------------------------

t("a boundary milestone splits 50/50 by default", () => {
  const s = buildFundingSchedule(ms({ name: "EOY2", amount: 3000, month: 24, split: true }), 4);
  assert.equal(s[1], 1500);
  assert.equal(s[2], 1500);
});

t("splitPct goes to the EARLIER year", () => {
  const s = buildFundingSchedule(ms({ name: "EOY2", amount: 1000, month: 24, split: true, splitPct: 80 }), 4);
  assert.equal(s[1], 800, "80% to year 2, the earlier side");
  assert.equal(s[2], 200);
});

t("a split requested off-boundary is ignored AND reported", () => {
  const a = auditFundingSchedule(ms({ name: "Mid", amount: 1000, month: 18, split: true }), 4);
  assert.equal(a.schedule[1], 1000, "month 18 is wholly in year 2");
  assert.equal(a.conserved, true);
  assert.ok(a.notes.some((n) => n.kind === "split_ignored_not_on_boundary"), "silently ignoring the split is the bug");
});

t("a split on the FINAL year boundary is ignored AND reported", () => {
  const a = auditFundingSchedule(ms({ name: "Completion", amount: 3500, month: 48, split: true }), 4);
  assert.equal(a.schedule[3], 3500);
  assert.ok(a.notes.some((n) => n.kind === "split_ignored_final_year"));
});

// ---- the custom-milestone trap ---------------------------------------------

t("a custom milestone dated PAST the term is clamped AND reported", () => {
  const a = auditFundingSchedule(ms({ name: "Completion", amount: 3500, month: 48 }), 3);
  assert.equal(a.schedule[2], 3500, "money is not discarded");
  assert.equal(a.conserved, true);
  const n = a.notes.find((x) => x.kind === "clamped_past_term");
  assert.ok(n, "a 4-year milestone on a 3-year term MUST be reported");
  assert.ok(textContains(n!.note, "one of them is wrong"));
});

t("resolveFundingRate surfaces the clamp as a warning, not silence", () => {
  const r = resolveFundingRate({ milestones: ms({ name: "Late", amount: 1000, month: 60 }),
    appYears: 4, billableHoursPerYear: 1800 });
  assert.ok(r.warnings.some((w) => w.includes("month 60")));
});

// ---- per-year divisors -----------------------------------------------------

t("term divisor is the SUM of yearly hours, never hours x years", () => {
  const r = resolveFundingRate({ milestones: ms({ name: "M", amount: 4000, month: 6 }),
    appYears: 4, yearHours: [1500, 1800, 1800, 1900] });
  assert.equal(r.totalHours, 7000, "1500+1800+1800+1900, not 1800x4=7200");
});

t("per-year mode divides that year's funding by THAT year's hours", () => {
  const r = resolveFundingRate({
    milestones: ms({ name: "Y1", amount: 3000, month: 6 }, { name: "Y2", amount: 1000, month: 18 }),
    appYears: 4, yearHours: [1500, 2000, 1800, 1800],
    mode: FUNDING_MODE.PER_YEAR, selectedYear: 1,
  });
  assert.equal(r.perHour, 2, "3000 / 1500 = 2.00");
  assert.equal(r.yearlyPerHour[1], 0.5, "1000 / 2000 = 0.50");
});

t("omitting yearHours warns that the term average cross-subsidises", () => {
  const r = resolveFundingRate({ milestones: EXAMPLE_MILESTONES, appYears: 4, billableHoursPerYear: 1800 });
  assert.ok(r.warnings.some((w) => w.includes("cross-subsidis")));
});

t("a selected year outside the term applies nothing and says so", () => {
  const r = resolveFundingRate({ milestones: EXAMPLE_MILESTONES, appYears: 3, yearHours: [1800, 1800, 1800],
    mode: FUNDING_MODE.PER_YEAR, selectedYear: 4 });
  assert.equal(r.perHour, 0);
  assert.ok(r.warnings.some((w) => w.includes("outside a 3-year term")));
});

// ---- pass-through ----------------------------------------------------------

t("pass-through: full / percent / none", () => {
  assert.equal(passThroughFactor(PASS_THROUGH.FULL), 1);
  assert.equal(passThroughFactor(PASS_THROUGH.PERCENT, 60), 0.6);
  assert.equal(passThroughFactor(PASS_THROUGH.NONE), 0);
  assert.equal(passThroughFactor(PASS_THROUGH.PERCENT, 999), 1, "clamped");
});

t("retained-by-GTO is reported, not just the discount", () => {
  const r = resolveFundingRate({ milestones: ms({ name: "M", amount: 10000, month: 6 }),
    appYears: 4, yearHours: [1800, 1800, 1800, 1800],
    method: PASS_THROUGH.PERCENT, percent: 40 });
  assert.equal(r.retainedByGto, 6000);
  assert.equal(r.totalFunding, 10000);
});

t("NONE leaves rates untouched and says why", () => {
  const r = resolveFundingRate({ milestones: EXAMPLE_MILESTONES, appYears: 4, billableHoursPerYear: 1800,
    method: PASS_THROUGH.NONE });
  assert.equal(r.perHour, 0);
  assert.ok(textContains(r.reason, "retained by the GTO"));
});

t("disabled funding is distinct from zero pass-through", () => {
  const r = resolveFundingRate({ milestones: EXAMPLE_MILESTONES, appYears: 4, billableHoursPerYear: 1800,
    enabled: false });
  assert.equal(r.perHour, 0);
  assert.ok(textContains(r.reason, "switched off"));
});

// ---- multiple schemes, each on its own terms -------------------------------

const scheme = (o: { id: string; label?: string; enabled?: boolean; milestones?: Milestone[]; method?: string; percent?: number; mode?: string }): FundingScheme => ({
  id: o.id, label: o.label ?? o.id, enabled: o.enabled,
  milestones: o.milestones, method: o.method ?? PASS_THROUGH.FULL,
  percent: o.percent, mode: o.mode ?? FUNDING_MODE.TERM_AVERAGED,
});

t("two schemes add their per-hour discounts, not their settings", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", milestones: ms({ name: "A", amount: 10000, month: 6 }) }),
    scheme({ id: "b", milestones: ms({ name: "B", amount: 5928, month: 6 }) }),
  ], { appYears: 4, yearHours: [1482, 1482, 1482, 1596] });
  // 10000/6042 = 1.6551, 5928/6042 = 0.9811 -> 2.6362
  assert.equal(c.totalFunding, 15928);
  assert.equal(round4(c.perHourAvg), 2.6362);
  assert.equal(c.activeCount, 2);
});

t("each scheme keeps its OWN pass-through — one retained, one passed", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", milestones: ms({ name: "A", amount: 10000, month: 6 }), method: PASS_THROUGH.FULL }),
    scheme({ id: "b", milestones: ms({ name: "B", amount: 90000, month: 6 }), method: PASS_THROUGH.NONE }),
  ], { appYears: 1, yearHours: [1000] });
  assert.equal(c.perHourAvg, 10, "only scheme A reaches the host");
  assert.equal(c.totalFunding, 100000, "both are still reported as received");
  assert.equal(c.retainedByGto, 90000);
});

t("the calculator's legacy passThrough value also means no rate impact", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", milestones: ms({ name: "A", amount: 5000, month: 6 }), method: "passThrough" }),
  ], { appYears: 1, yearHours: [1000] });
  assert.equal(c.perHourAvg, 0, "an unrecognised method must never pass money through by accident");
});

t("each scheme keeps its OWN spread — term and per-year side by side", () => {
  const c = combineFundingSchemes([
    // TERM scheme: 4000 over 4000 term hours = 1.00/hr flat
    scheme({ id: "t", milestones: ms({ name: "T", amount: 4000, month: 6 }), mode: FUNDING_MODE.TERM_AVERAGED }),
    // PER-YEAR scheme: all 2000 lands in year 2, over year 2's 1000 hours = 2.00/hr
    scheme({ id: "y", milestones: ms({ name: "Y", amount: 2000, month: 18 }), mode: FUNDING_MODE.PER_YEAR }),
  ], { appYears: 4, yearHours: [1000, 1000, 1000, 1000] });

  assert.equal(c.perHourByYear[0], 1, "yr1: term scheme only");
  assert.equal(c.perHourByYear[1], 3, "yr2: term 1.00 + per-year 2.00");
  assert.equal(c.perHourByYear[2], 1, "yr3: term scheme only");
});

t("selecting a year does NOT re-spread a term-averaged scheme", () => {
  const c = combineFundingSchemes([
    scheme({ id: "t", milestones: ms({ name: "T", amount: 4000, month: 6 }), mode: FUNDING_MODE.TERM_AVERAGED }),
  ], { appYears: 4, yearHours: [1000, 1000, 1000, 1000] });
  assert.deepEqual(c.perHourByYear, [1, 1, 1, 1], "term-averaged means flat — the year view must not change it");
});

t("a disabled scheme contributes nothing but the others still count", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", milestones: ms({ name: "A", amount: 1000, month: 6 }) }),
    scheme({ id: "b", enabled: false, milestones: ms({ name: "B", amount: 9000, month: 6 }) }),
  ], { appYears: 1, yearHours: [1000] });
  assert.equal(c.totalFunding, 1000);
  assert.equal(c.activeCount, 1);
});

t("no schemes at all is zero, not NaN", () => {
  const c = combineFundingSchemes([], { appYears: 4, yearHours: [1000, 1000, 1000, 1000] });
  assert.equal(c.perHourAvg, 0);
  assert.equal(c.totalFunding, 0);
  assert.ok(c.perHourByYear.every((x) => x === 0));
});

t("warnings are attributed to the scheme that raised them", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", label: "WA Regional", milestones: ms({ name: "Late", amount: 1000, month: 99 }) }),
  ], { appYears: 4, yearHours: [1000, 1000, 1000, 1000] });
  assert.ok(c.warnings.some((w) => w.startsWith("WA Regional:")), "a warning with no scheme name is unactionable");
});

t("schemes cannot collide — same milestone ids in different schemes", () => {
  const c = combineFundingSchemes([
    scheme({ id: "a", milestones: [{ id: 1, name: "X", amount: 1000, month: 6 }] }),
    scheme({ id: "b", milestones: [{ id: 1, name: "Y", amount: 2000, month: 6 }] }),
  ], { appYears: 1, yearHours: [1000] });
  assert.equal(c.totalFunding, 3000, "both must count despite sharing milestone id 1");
});

// ---- which rate lines carry the discount -----------------------------------

t("penalty rates carry funding; overtime rates do not", () => {
  assert.equal(fundingAppliesToRateCategory("penalty"), true);
  assert.equal(fundingAppliesToRateCategory("overtime"), false);
});

// ---- no default wages doctrine ---------------------------------------------

t("the example milestones are named EXAMPLE, not DEFAULT", () => {
  assert.ok(Array.isArray(EXAMPLE_MILESTONES));
  const r = resolveFundingRate({ milestones: [], appYears: 4, billableHoursPerYear: 1800 });
  assert.equal(r.perHour, 0, "no milestones means no discount — never a seeded figure");
  assert.equal(r.totalFunding, 0);
});
