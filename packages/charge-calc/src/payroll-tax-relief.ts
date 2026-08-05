/**
 * Payroll tax — state rates, threshold position, and apprentice/trainee RELIEF.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTED INTO @bsuite/charge-calc 2026-08-03 on operator ruling, from R80.4
 * (precedent__bsuite__20260803__exemption_is_not_rebate).
 *
 * READ THIS BEFORE MIGRATING: the OLD PAYROLL_TAX_EXEMPT_STATES in defaults.ts
 * was never reachable — not exported from the barrel, not used by calculate().
 * Meanwhile crm7/src/lib/payrollTax.ts and
 * R80.3/src/services/awardRulesEngine.ts each ran their OWN live copy of the
 * same wrong table. So this file being correct fixes nothing until those two
 * copies are deleted and re-pointed here. That is the migration, and it is the
 * whole point.
 *
 * REWRITTEN 2026-08-02. The previous table was inherited from R80.3, carried a
 * "VERIFY ANNUALLY" comment nobody had actioned, and was WRONG IN EVERY ROW.
 * It modelled a single boolean — "is this rate type exempt in this state" —
 * which cannot express what the jurisdictions actually do. What it got wrong:
 *
 *   NSW  claimed EXEMPT for AP/AA/TN. Revenue NSW states plainly: "Apprentice/
 *        trainee wages are not exempt from payroll tax in NSW." It is a REBATE.
 *   QLD  claimed trainees NOT exempt. QRO exempts apprentices AND trainees.
 *   VIC  claimed EXEMPT for AP/AA/TN. Victoria taxes them by default; the
 *        exemption that matters to a GTO is a SEPARATE, conditional one.
 *   WA   claimed trainees EXEMPT. Trainee contracts registered from 1 July 2019
 *        are NOT exempt.
 *   SA   claimed EXEMPT. The exemption was a window (10 Nov 2020 – 30 Jun 2022);
 *        contracts after it are taxable.
 *   TAS  claimed EXEMPT. Tasmania runs a time-limited REBATE, not an exemption.
 *   ACT  claimed EXEMPT for AP/AA. Unverified against the Revenue Office.
 *   NT   claimed trainees NOT exempt. NT exempts apprentices AND trainees.
 *
 * The 16 tests that guarded the old table were pinning those wrong answers in
 * place. A test that asserts a falsehood is worse than no test.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * THE STRUCTURAL FIX: EXEMPTION AND REBATE ARE NOT THE SAME THING.
 * An EXEMPTION removes the wage from the taxable base — the charge rate
 * genuinely carries no payroll tax. A REBATE means the wage IS taxable, the
 * employer PAYS the tax, and claims money back later. Treating a rebate as an
 * exemption understates the cost at quote time and, on a full apprentice
 * payroll in NSW, understates it by the whole payroll tax line.
 *
 * A rebate is therefore modelled the way FUNDING is modelled: a real receipt,
 * separately reported, whose pass-through to the host is a commercial decision
 * the GTO makes — not something this module may assume.
 *
 * WHAT THIS MODULE WILL NOT DO: decide whether a condition is met. Whether the
 * GTO is Victorian-Treasurer-declared, whether a WA contract was registered
 * before 1 July 2019, whether an apprentice is a "new entrant" — those are
 * facts about the business and the contract. Unmet or unknown conditions return
 * an ELECTION, never a silent exemption. Same doctrine as the clause rules.
 *
 * VERIFY ANNUALLY, AND MEAN IT. Sources and dates are on every row.
 */

/** Local narrowing predicate — Number.isFinite does not narrow number|undefined. */
function isNum(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

import type { AustralianState } from './types.js';
import type { EmployeeRateTypeCode } from './awards/schema.js';
export type { AustralianState };

/**
 * Rate type codes as MAPD uses them. AP apprentice, AA adult apprentice,
 * TN trainee. The apprentice/trainee split is legislative, not cosmetic —
 * WA exempts apprentices and taxes trainees.
 */
export type RateTypeCode = EmployeeRateTypeCode;

/*
 * WHY THIS IS NOW THE FULL MAPD VOCABULARY, AND CLOSED.
 *
 * It was `"AP" | "AA" | "TN" | (string & {})`. Both halves of that were wrong,
 * in opposite directions, and together they produced a money bug in R80.4 that
 * the R80.4 lane found and fixed on 2026-08-06:
 *
 *   A labour-hire worker with the Adult cohort selected resolved to "AA" —
 *   Adult Apprentice. Measured in WA, above threshold, conditions confirmed:
 *     AA (what it sent)            0.00%   exempt
 *     AP (the fallback default)    0.00%   exempt
 *     AD (correct for a worker)    5.50%   not exempt
 *   A silent 5.5%-of-wages under-charge of the host. Nothing failed. Both
 *   codes are legal and the number is plausible.
 *
 * THE UNION WAS THE PRESSURE. It did not name AD, so a caller holding a
 * qualified adult worker COULD NOT EXPRESS ONE and had to pick something
 * wrong. And `(string & {})` meant the compiler accepted whatever they picked.
 * A type that omits the right answer and accepts every wrong one is not
 * neutral — it is the thing that made the bug easy to write.
 *
 * The relief TABLE was fail-closed throughout, and this package already had a
 * test pinning that (payroll-tax-relief-non-apprentice.test.ts). The table was
 * never the defect and the test never could have caught this: it asserted that
 * AD/JN/CA reach no relief rule, while the defect was a caller handing the
 * table AA. Pinning the table does not pin the caller. The R80.4 lane made
 * that criticism of my test and it is correct.
 *
 * Closing the union is what catches it: widening the same union in R80.4
 * surfaced their loose call site AT COMPILE TIME, and would have caught
 * R80.3's too.
 *
 * Aliased to `EmployeeRateTypeCode` rather than re-listed, because this
 * package had THREE rate-type vocabularies that disagreed —
 * awards/schema.ts (which does carry AD), defaults.ts, and this file — and a
 * fourth spelling of the same idea is how they diverged in the first place.
 */

/** How a jurisdiction relieves apprentice/trainee payroll tax, if at all. */
export const RELIEF_TYPE = {
  /** Wage is removed from the taxable base. The rate line is genuinely 0%. */
  EXEMPTION: "exemption",
  /** Wage IS taxable and IS paid; money comes back later. NOT a rate reduction. */
  REBATE: "rebate",
  /** No relief. Ordinary rate applies. */
  NONE: "none",
  /** Not verified against the revenue office. Requires an election, not a guess. */
  UNVERIFIED: "unverified",
} as const;

export type ReliefType = (typeof RELIEF_TYPE)[keyof typeof RELIEF_TYPE];

/** A condition the GTO must confirm before relief can be applied. */
export interface ReliefCondition {
  /** Stable key so a caller can record the answer against it. */
  key: string;
  /** The question, in the words someone can actually answer. */
  question: string;
  /** Why it matters — what changes on yes vs no. */
  because: string;
}

export interface ReliefRule {
  type: ReliefType;
  /** Which rate type codes this rule reaches. */
  appliesTo: RateTypeCode[];
  /** Conditions that must ALL be confirmed before the relief applies. */
  conditions?: ReliefCondition[];
  /** Relief stops after this date. ISO. */
  endsOn?: string;
  note: string;
  source: string;
  verified: string;
}

// PAYROLL_TAX_RATES is NOT redefined here — defaults.ts owns it. A second copy
// of a rate table is exactly how this defect happened in the first place.
import { PAYROLL_TAX_RATES } from './defaults.js';

export const PAYROLL_TAX_SOURCES: Record<AustralianState, string> = {
  WA: "State Revenue WA — 5.5%",
  VIC: "SRO Victoria — 4.85% general rate",
  QLD: "QRO — 4.75% general rate",
  NSW: "Revenue NSW — 5.45% general rate",
  SA: "RevenueSA — 4.95% general rate",
  TAS: "SRO Tasmania — 4.0% (6.1% above $2m)",
  ACT: "ACT Revenue Office — 6.75% from 1 July 2026 (was 6.85%)",
  NT: "NT Territory Revenue Office — 5.5% (6.5% for groups $100m+ from 1 July 2026)",
};

/**
 * Apprentice / trainee relief, per jurisdiction. Verified 2026-08-02 against
 * the revenue offices named in each `source`.
 */
export const APPRENTICE_RELIEF: Record<AustralianState, ReliefRule[]> = {
  WA: [
    {
      type: RELIEF_TYPE.EXEMPTION,
      appliesTo: ["AP", "AA"],
      conditions: [
        { key: "wa_contract_registered", question: "Is the apprentice under a REGISTERED training contract?",
          because: "The exemption runs for the duration of a registered contract." },
        { key: "wa_contract_not_suspended", question: "Is the training contract currently unsuspended?",
          because: "WA expressly withdraws the exemption while a contract is SUSPENDED — those wages must be declared as taxable. Easy to miss on a stood-down apprentice." },
      ],
      note: "Wages to an apprentice under a registered training contract are exempt for the duration of the contract. Suspension breaks it.",
      source: "wa.gov.au — Payroll Tax Employer Guide, Exemptions",
      verified: "2026-08-02",
    },
    {
      type: RELIEF_TYPE.NONE,
      appliesTo: ["TN"],
      note: "Trainees under a training contract REGISTERED FROM 1 JULY 2019 are NOT exempt. Only contracts registered before that date retain the exemption. Check the Class A/B Register (DTWD) if unsure whether a contract is an apprenticeship or a traineeship — the distinction decides the tax.",
      source: "wa.gov.au — Payroll Tax Employer Guide, Exemptions",
      verified: "2026-08-02",
    },
  ],

  VIC: [
    {
      type: RELIEF_TYPE.EXEMPTION,
      appliesTo: ["AP", "AA", "TN"],
      conditions: [
        { key: "vic_recognised_gto", question: "Is this entity a RECOGNISED group training organisation — declared by the Victorian Treasurer and gazetted, with written VRQA recognition?",
          because: "The GTO exemption is not automatic. Without the Treasurer's declaration the wages are taxable, whatever the training contract says." },
        { key: "vic_new_entrant_window", question: "Did the apprentice/trainee sign the training contract within 3 months of starting FULL-TIME with the GTO (or 12 months if PART-TIME)?",
          because: "The exemption reaches NEW ENTRANTS only. Someone employed by the GTO long before signing a contract falls outside it." },
      ],
      note: "GTO-SPECIFIC AND THE MOST IMPORTANT ROW IN THIS TABLE FOR A GROUP TRAINING ORGANISATION. Victoria taxes apprentice and trainee wages by DEFAULT; a recognised GTO's new-entrant wages are exempt. Admin staff and non-qualifying apprentices remain taxable. A separate exemption covers RE-EMPLOYED (out-of-trade) apprentices/trainees where the previous contract ceased before completion.",
      source: "sro.vic.gov.au — Group training organisations; Re-employed apprentices or trainees",
      verified: "2026-08-02",
    },
  ],

  QLD: [
    {
      type: RELIEF_TYPE.EXEMPTION,
      appliesTo: ["AP", "AA", "TN"],
      conditions: [
        { key: "qld_contract_registered", question: "Is the training contract registered under the Further Education and Training Act 2014?",
          because: "Registration under that Act is what makes the person an apprentice or trainee for payroll tax purposes." },
        { key: "qld_wages_in_course", question: "Are these wages for the apprenticeship/traineeship itself, and not for other roles or periods?",
          because: "QRO expressly excludes wages for periods before or after, and wages for other duties where the person holds multiple roles." },
      ],
      note: "Apprentices AND trainees are exempt — allowances too. A further 50% rebate has been available on top; check whether it still runs.",
      endsOn: "2026-06-30",
      source: "qro.qld.gov.au — Exempt wages; Apprentice rebate",
      verified: "2026-08-02",
    },
  ],

  NT: [
    {
      type: RELIEF_TYPE.EXEMPTION,
      appliesTo: ["AP", "AA", "TN"],
      conditions: [
        { key: "nt_approved_contract", question: "Is the apprentice/trainee under an approved training contract?",
          because: "The exemption is tied to an approved contract." },
      ],
      note: "Apprentices and eligible trainees are exempt. From 1 July 2025 the maximum annual deduction rose to $2.5m.",
      source: "treasury.nt.gov.au — Territory Revenue Office",
      verified: "2026-08-02",
    },
  ],

  NSW: [
    {
      type: RELIEF_TYPE.REBATE,
      appliesTo: ["AP", "AA", "TN"],
      note: "NOT AN EXEMPTION. Revenue NSW: \"Apprentice/trainee wages are not exempt from payroll tax in NSW.\" They are declared separately and form part of total taxable wages; the employer then claims a REBATE equal to the difference between the tax with those wages in and with them out. Every liable amount counts — wages, super, fringe benefits, allowances, bonuses, commissions, termination payments. So the charge rate carries the tax and the rebate is a later receipt.",
      source: "revenue.nsw.gov.au — Payroll tax for apprentice and trainee wages",
      verified: "2026-08-02",
    },
  ],

  TAS: [
    {
      type: RELIEF_TYPE.REBATE,
      appliesTo: ["AP", "AA", "TN"],
      conditions: [
        { key: "tas_commencement_window", question: "Did employment commence inside a rebate window?",
          because: "Tasmania's scheme runs in dated windows rather than continuously — apprentices/trainees commencing 1 Jul 2024–30 Jun 2025, and apprentices commencing 1 Jul 2025–30 Jun 2026. Outside a window there is no relief." },
      ],
      note: "A REBATE SCHEME, not an exemption, and time-boxed by commencement date. Verify the current window before relying on it.",
      source: "sro.tas.gov.au — Payroll tax rebate scheme",
      verified: "2026-08-02",
    },
  ],

  SA: [
    {
      type: RELIEF_TYPE.NONE,
      appliesTo: ["AP", "AA", "TN"],
      note: "THE EXEMPTION HAS LAPSED. It covered apprentices/trainees who COMMENCED between 10 November 2020 and 30 June 2022. Contracts commencing after that are taxable. A charge rate for a current SA apprentice should carry payroll tax.",
      source: "revenuesa.sa.gov.au — Apprentices and trainees",
      verified: "2026-08-02",
    },
  ],

  ACT: [
    {
      type: RELIEF_TYPE.UNVERIFIED,
      appliesTo: ["AP", "AA", "TN"],
      conditions: [
        { key: "act_confirm_with_revenue_office", question: "Confirm the current ACT position directly with the ACT Revenue Office.",
          because: "Secondary sources describe a FIRST-YEAR exemption for new entrant trainees, which is both narrower than a general exemption and possibly out of date. It has not been verified against the Revenue Office, so this module will not assert it." },
      ],
      note: "NOT VERIFIED. Deliberately returns an election rather than a figure. An unverified 0% is indistinguishable from a checked one on screen, and that is the failure this engine exists to prevent.",
      source: "UNVERIFIED — needs ACT Revenue Office confirmation",
      verified: "never",
    },
  ],
};

export const THRESHOLD_POSITION = {
  ABOVE: "above_threshold",
  BELOW: "below_threshold",
};

export interface PayrollTaxResult {
  /** Rate to apply to the CHARGE RATE. A rebate does NOT reduce this. */
  rate: number;
  /** True only for a genuine exemption. */
  exempt: boolean;
  reliefType: ReliefType;
  belowThreshold?: boolean;
  isGrouped: boolean;
  general: number | null;
  reason: string;
  applied: string[];
  /** Conditions the GTO must confirm before relief applies. */
  pendingConditions: ReliefCondition[];
  /** True where a figure cannot responsibly be produced yet. */
  election: boolean;
  /** A rebate is a real receipt, reported separately — never a rate reduction. */
  rebateAvailable: boolean;
  rebateNote?: string;
  source?: string;
  ruleNote?: string;
  verified?: string;
}

/** Australian FY start year (July–June), on the Australia/Sydney civil calendar. */
export function currentAustralianFinancialYear(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney", year: "numeric", month: "numeric",
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  return m >= 7 ? y : y - 1;
}

/** The relief rule reaching this rate type in this state, or null. */
export function reliefRuleFor(state: AustralianState | string, rateTypeCode: RateTypeCode): ReliefRule | null {
  const rules = APPRENTICE_RELIEF[state as AustralianState];
  if (!rules) return null;
  return rules.find((r) => r.appliesTo.includes(rateTypeCode)) ?? null;
}

/**
 * Resolve the payroll tax rate actually payable on the CHARGE RATE.
 *
 * `confirmedConditions` records the GTO's answers by condition key. A condition
 * that is absent or false blocks the relief and returns an election — it does
 * NOT quietly fall back to the general rate OR to zero, because both of those
 * are a figure someone would quote.
 */
export function resolvePayrollTax({
  state,
  rateTypeCode,
  thresholdPosition = THRESHOLD_POSITION.ABOVE,
  isGrouped = false,
  generalRateOverride,
  confirmedConditions = {},
  asOf,
}: {
  state: AustralianState | string;
  rateTypeCode: RateTypeCode;
  thresholdPosition?: string;
  isGrouped?: boolean;
  generalRateOverride?: number;
  confirmedConditions?: Record<string, boolean>;
  asOf?: string;
}): PayrollTaxResult {
  const general = isNum(generalRateOverride)
    ? generalRateOverride
    : PAYROLL_TAX_RATES[state as AustralianState];

  const base = {
    isGrouped, applied: [] as string[], pendingConditions: [] as ReliefCondition[],
    election: false, rebateAvailable: false,
  };

  if (general === undefined || !isNum(general)) {
    return { ...base, rate: 0, exempt: false, reliefType: RELIEF_TYPE.UNVERIFIED, general: null, election: true,
      reason: `No payroll tax rate on record for ${state || "(no state)"} — cannot cost this placement.` };
  }

  const applied: string[] = [];
  const belowThreshold = thresholdPosition === THRESHOLD_POSITION.BELOW;
  if (belowThreshold) applied.push("Tenant below the payroll tax threshold");

  const rule = reliefRuleFor(state, rateTypeCode);
  const source = rule?.source;
  const ruleNote = rule?.note;
  const verified = rule?.verified;

  // No rule at all for this rate type — the general rate applies.
  if (!rule) {
    const rate = belowThreshold ? 0 : general;
    return { ...base, rate, exempt: false, reliefType: RELIEF_TYPE.NONE, belowThreshold, general, applied,
      reason: belowThreshold
        ? `Tenant is below the ${state} payroll tax threshold.`
        : `${state} general rate ${(general * 100).toFixed(2)}% applies — no apprentice/trainee relief recorded for ${rateTypeCode}.` };
  }

  // Lapsed relief.
  if (rule.endsOn && asOf && asOf > rule.endsOn) {
    const rate = belowThreshold ? 0 : general;
    return { ...base, rate, exempt: false, reliefType: RELIEF_TYPE.NONE, belowThreshold, general, applied,
      source, ruleNote, verified,
      reason: `${state} relief for ${rateTypeCode} ended on ${rule.endsOn}. The ${(general * 100).toFixed(2)}% general rate applies as at ${asOf}.` };
  }

  if (rule.type === RELIEF_TYPE.UNVERIFIED) {
    return { ...base, rate: belowThreshold ? 0 : general, exempt: false, reliefType: RELIEF_TYPE.UNVERIFIED,
      belowThreshold, general, applied, election: true, pendingConditions: rule.conditions ?? [],
      source, ruleNote, verified,
      reason: `${state}'s apprentice/trainee position is NOT VERIFIED. Costed at the general rate meanwhile — but confirm with the revenue office before quoting, because an unverified 0% looks exactly like a checked one.` };
  }

  if (rule.type === RELIEF_TYPE.NONE) {
    const rate = belowThreshold ? 0 : general;
    return { ...base, rate, exempt: false, reliefType: RELIEF_TYPE.NONE, belowThreshold, general, applied,
      source, ruleNote, verified,
      reason: belowThreshold
        ? `Tenant is below the ${state} threshold. Note also: ${rule.note}`
        : `${state} general rate ${(general * 100).toFixed(2)}% applies to ${rateTypeCode}. ${rule.note}` };
  }

  // A REBATE never reduces the charge rate — the tax is paid.
  if (rule.type === RELIEF_TYPE.REBATE) {
    const unmet = (rule.conditions ?? []).filter((c) => confirmedConditions[c.key] !== true);
    const rate = belowThreshold ? 0 : general;
    return {
      ...base, rate, exempt: false, reliefType: RELIEF_TYPE.REBATE, belowThreshold, general, applied,
      rebateAvailable: unmet.length === 0,
      pendingConditions: unmet,
      rebateNote: "A rebate is a later RECEIPT, not a rate reduction. Whether any of it is passed to the host is a commercial decision — treat it like a funding scheme, not like an exemption.",
      source, ruleNote, verified,
      reason: belowThreshold
        ? `Tenant is below the ${state} threshold, so nothing is payable. Separately, ${state} offers a REBATE on apprentice/trainee wages.`
        : `${state} charges the full ${(general * 100).toFixed(2)}% on ${rateTypeCode} wages — this is a REBATE jurisdiction, not an exemption, so the charge rate must carry the tax.${unmet.length ? ` Rebate eligibility unconfirmed: ${unmet.map((c) => c.question).join(" ")}` : " A rebate is claimable and should be recorded as a receipt."}`,
    };
  }

  // EXEMPTION — but only once every condition is confirmed.
  const unmet = (rule.conditions ?? []).filter((c) => confirmedConditions[c.key] !== true);
  if (unmet.length) {
    return {
      ...base, rate: belowThreshold ? 0 : general, exempt: false, reliefType: RELIEF_TYPE.EXEMPTION,
      belowThreshold, general, applied, election: true, pendingConditions: unmet,
      source, ruleNote, verified,
      reason: `${state} exempts ${rateTypeCode} wages, but ${unmet.length} condition(s) are unconfirmed, so the exemption cannot be applied yet: ${unmet.map((c) => c.question).join(" ")} Costed at the general rate until answered — assuming the exemption would understate the cost if it turned out not to apply.`,
    };
  }

  applied.push(`${rateTypeCode} wages are payroll tax exempt in ${state}`);
  return {
    ...base, rate: 0, exempt: true, reliefType: RELIEF_TYPE.EXEMPTION, belowThreshold, general, applied,
    source, ruleNote, verified,
    reason: belowThreshold
      ? `Exempt (${rateTypeCode} in ${state}) — and the tenant is below threshold. Either alone gives 0%.`
      : `Exempt — ${rateTypeCode} wages are not subject to payroll tax in ${state}. ${rule.note}`,
  };
}

/** Which rate types this state relieves, and how. For explaining a peer's difference. */
export function reliefSummaryFor(state: AustralianState | string) {
  const rules = APPRENTICE_RELIEF[state as AustralianState];
  if (!rules) return [];
  return rules.map((r) => ({ type: r.type, appliesTo: r.appliesTo, note: r.note, source: r.source, verified: r.verified }));
}

/** States that grant a genuine EXEMPTION (before conditions) for this rate type. */
export function statesExempting(rateTypeCode: RateTypeCode): AustralianState[] {
  return (Object.keys(APPRENTICE_RELIEF) as AustralianState[]).filter((s) => {
    const r = reliefRuleFor(s, rateTypeCode);
    return r?.type === RELIEF_TYPE.EXEMPTION;
  });
}

/** States where relief is a REBATE — the charge rate must still carry the tax. */
export function rebateOnlyStates(): AustralianState[] {
  return (Object.keys(APPRENTICE_RELIEF) as AustralianState[]).filter((s) =>
    APPRENTICE_RELIEF[s].some((r) => r.type === RELIEF_TYPE.REBATE));
}

/** States with NO relief at all for this rate type. The ones people assume are covered. */
export function statesWithNoRelief(rateTypeCode: RateTypeCode): AustralianState[] {
  return (Object.keys(APPRENTICE_RELIEF) as AustralianState[]).filter((s) => {
    const r = reliefRuleFor(s, rateTypeCode);
    return r?.type === RELIEF_TYPE.NONE;
  });
}

/** The trainee-vs-apprentice divergence, enumerated. The cross-border trap. */
export function apprenticeTraineeDivergence() {
  return (Object.keys(APPRENTICE_RELIEF) as AustralianState[])
    .map((s) => ({ state: s, apprentice: reliefRuleFor(s, "AP")?.type, trainee: reliefRuleFor(s, "TN")?.type }))
    .filter((r) => r.apprentice !== r.trainee);
}
