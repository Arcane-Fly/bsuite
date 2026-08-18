import type {
  CalcConfig,
  CalcResult,
  PayItemGroupRef,
  PayItemCategory,
  RateResult,
  OncostBreakdown,
  Allowance,
} from './types.js';
import { DEFAULT_RDO_CONFIG } from './types.js';
import {
  casualPenaltyMultiplierForAward,
  CasualPenaltyConventionUnmodelled,
} from './awards/casual-penalty-convention.js';

interface RateKeyResolution {
  key: string;
  payItemGroupId?: string;
  payItemGroup?: PayItemGroupRef;
  category?: PayItemCategory;
}

/**
 * Converts an allowance to a per-hour rate.
 * Matches charge-calculator.jsx lines 36-44.
 */
function allowanceToPerHour(
  a: Allowance,
  wage: number,
  hpw: number,
  dpw: number,
): number {
  switch (a.type) {
    case 'perHour':
      return a.amount;
    case 'perDay':
      return a.amount / (hpw / dpw);
    case 'perWeek':
      return a.amount / hpw;
    case 'percent':
      return wage * (a.amount / 100);
    case 'perKm':
      return a.amount; // user enters effective $/hr
    default:
      return 0;
  }
}

function validatePayItemGroupId(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} must be a non-empty pay_item_groups.id when provided`);
  }
  return trimmed;
}

function resolveRateKey(
  legacyId: string,
  payItemGroupId: string | undefined,
  payItemGroup: PayItemGroupRef | undefined,
  field: string,
): RateKeyResolution {
  const explicitId = validatePayItemGroupId(payItemGroupId, `${field}.payItemGroupId`);
  const refId = validatePayItemGroupId(payItemGroup?.id, `${field}.payItemGroup.id`);

  if (explicitId && refId && explicitId !== refId) {
    throw new Error(`${field}.payItemGroupId must match ${field}.payItemGroup.id`);
  }

  const groupId = explicitId ?? refId;
  return {
    key: groupId ?? legacyId,
    payItemGroupId: groupId,
    payItemGroup,
    category: payItemGroup?.category,
  };
}

function assignRate(
  rates: Record<string, RateResult>,
  ratesByPayItemGroupId: Record<string, RateResult>,
  key: string,
  legacyKey: string,
  rate: RateResult,
): void {
  rates[key] = rate;
  if (key !== legacyKey) {
    rates[legacyKey] = rate;
  }
  if (rate.payItemGroupId) {
    ratesByPayItemGroupId[rate.payItemGroupId] = rate;
  }
}

/**
 * Core charge rate calculation engine.
 *
 * This is the single source of truth for all charge rate calculations
 * across R80.3 and CRM7. Formulas match the gold-standard
 * charge-calculator.jsx validated against professional Excel spreadsheets.
 */
export function calculate(cfg: CalcConfig): CalcResult {
  const {
    wage,
    hoursPerWeek: hpw,
    // hoursPerDay is used indirectly via hpw/dpw in allowanceToPerHour
    hoursPerDay: _hpd,
    daysPerWeek: dpw,
    billableWeeks: billableWk,
    trainingWeeks: _rawTrainWk,
    trainingWeeksPerYear,
    currentYear,
    apprenticeshipYears: appYears,
    annualLeaveDays: alDays,
    publicHolidayDays: phDays,
    sickLeaveDays: sickDays,
    leaveLoadingPercent,
    superRate,
    superOnOT,
    wcRate,
    payrollTaxRate,
    otOncostFactor,
    penaltyOncostAdder,
    overheadType: ohType,
    overheadValue: ohVal,
    studyCost: study,
    ppeCost: ppe,
    trainingFeesAnnual: trainingFees = 0,
    marginType,
    marginValue: marginVal,
    allowances,
    penalties,
    funding,
    casualLoading,
    awardCode,
    rdo,
  } = cfg;

  // Suppress unused variable lint — _hpd is destructured for completeness
  // but the per-day conversion uses hpw/dpw directly.
  void _hpd;

  // Resolve effective training weeks: per-year override takes precedence
  // when both trainingWeeksPerYear and currentYear are provided.
  const trainWk =
    trainingWeeksPerYear && currentYear
      ? (trainingWeeksPerYear[currentYear - 1] ?? _rawTrainWk)
      : _rawTrainWk;

  // --- Casual worker adjustments ---
  // When casualLoading is defined, the worker is casual. Loading replaces leave
  // entitlements (annual leave, sick leave, public holidays, leave loading).
  const isCasual = casualLoading !== undefined;
  const effectiveAlDays = isCasual ? 0 : alDays;
  const effectivePhDays = isCasual ? 0 : phDays;
  const effectiveSickDays = isCasual ? 0 : sickDays;
  const leaveLoad = (isCasual ? 0 : leaveLoadingPercent) / 100;

  // --- Allowance aggregation (lines 34-45) ---
  let allowPerHour = 0;
  let allowPerHourSuper = 0;
  for (const a of allowances.filter((al) => al.enabled)) {
    const ph = allowanceToPerHour(a, wage, hpw, dpw);
    allowPerHour += ph;
    if (a.superApplicable) allowPerHourSuper += ph;
  }

  // --- Received wage (line 47-51) ---
  // Casual loading per hour is applied on top of the base wage (replaces leave costs)
  const casualLoadingPH = isCasual ? wage * (casualLoading as number) : 0;
  const recv = wage + allowPerHour + casualLoadingPH;
  /**
   * The wage BEFORE any casual loading — identical to `recv` for a
   * non-casual (casualLoadingPH is 0 there). Penalty/overtime rows must
   * multiply THIS, never `recv`, once a casual's own effective multiplier
   * (resolved per-award below) already carries the loading itself —
   * multiplying the LOADED `recv` by a standard percentage that ALSO
   * assumes an unloaded base is exactly how "base x 1.25 x 1.50 = 187.5%"
   * happened instead of the correct "base x 1.75 = 175%" (MA000020
   * cl.12.5/12.6). See `awards/casual-penalty-convention.ts`.
   */
  const recvBase = wage + allowPerHour;
  const superBearingRate = wage + allowPerHourSuper;
  const wkPay = recv * hpw;
  const wkWage = wage * hpw;
  const wkSuperBearing = superBearingRate * hpw;

  // --- Week allocation (lines 53-58) ---
  const alWk = effectiveAlDays / dpw;
  const phWk = effectivePhDays / dpw;
  const sickWk = effectiveSickDays / dpw;
  const totalNonBillable = alWk + phWk + sickWk + trainWk;
  const impliedBillable = 52 - totalNonBillable;

  // --- Annual pay components (lines 60-68) ---
  const worked = wkPay * billableWk;
  const tafePay = wkPay * trainWk;
  const alPay = wkPay * alWk * (1 + leaveLoad);
  const persLeave = wkPay * sickWk;
  const phPay = wkPay * phWk;
  const totAnnPay = wkPay * 48 + alPay;

  // --- Superannuation (lines 70-73) ---
  const totAnnPaySuper =
    wkSuperBearing * 48 + wkWage * alWk * (1 + leaveLoad);
  const superAmt = totAnnPaySuper * superRate;
  const annPkg = totAnnPay + superAmt;

  // --- Workers comp -- worked + training only (line 75) ---
  const wc = (worked + tafePay) * wcRate;

  // --- Overheads (line 78) ---
  const oh = ohType === 'percent' ? totAnnPay * (ohVal / 100) : ohVal;

  // --- Payroll tax ---
  const payrollTaxAmt = totAnnPay * payrollTaxRate;

  // --- Total cost (line 80) ---
  // trainingFeesAnnual: fixed annual training fee amortised into total cost
  // (feature: R80 training-fees; was silently dropped before 2026-07-25).
  const totCost = annPkg + study + ppe + wc + oh + payrollTaxAmt + trainingFees;

  // --- RDO accrual -> billable hours (ledger M-2) ---
  /**
   * `cfg.rdo` used to be carried and never read. crm7's
   * `usePlacementChargeCalc` populated it, said so in its own comment
   * ("calculate() itself does not consume cfg.rdo"), and emitted an operator
   * warning telling them to check the rate by hand. This is where that stops.
   *
   * WHICH FIGURE MOVES. `hoursPerWeek` is, and stays, the PAID week (see its
   * doc comment on `CalcConfig`) — crm7 passes 38 and deliberately leaves it
   * alone. Subtracting the accrual from it would pay a full-timer for 36
   * hours and understate wage, super and leave by the accrual fraction: the
   * money bug in the opposite direction. Under MA000020 cl.16.2 the accrual
   * is DEFERRED pay, not less pay — annual paid hours are unchanged.
   *
   * What the accrual genuinely moves is BILLABLE hours. The host has the
   * worker on site for 8 hours to fund 7.6 paid, so the banked 0.4h/day is
   * time the host has already had and is billed for when the RDO is taken.
   * R80.4's engine (`src/awards/calculate.ts:189-200`), which has priced this
   * for MA000020 all along, is the reference:
   *
   *   0.4 x (D - r) = hpdPaid x r   ->   r = 0.4D / (hpdPaid + 0.4)
   *
   * with D = paid days in the year. Accrual continues through paid leave and
   * public holidays (cl.16.3(a)) and stops only on RDO days themselves, which
   * is exactly what solving for `r` expresses — hence `52 * dpw`, not
   * `billableWk * dpw`. At D = 260, hpdPaid = 7.6 this yields r = 13 days =
   * 98.8 hours, the 19-worked-days-per-RDO the clause states.
   *
   * `enabled: false` (the default) is a first-class state, not an edge case:
   * `rdoHoursAnnual` is 0 and `bHrs` is byte-identical to the pre-M-2 value,
   * so no existing quote, golden fixture or FWC reconciliation moves.
   */
  const rdoCfg = rdo ?? DEFAULT_RDO_CONFIG;
  const hpdPaid = dpw > 0 ? hpw / dpw : 0;
  const rdoAccrualPerDay =
    rdoCfg.enabled && rdoCfg.accrualHoursPerDay > 0 ? rdoCfg.accrualHoursPerDay : 0;
  const rdoDaysAnnual =
    rdoAccrualPerDay > 0 && hpdPaid + rdoAccrualPerDay > 0
      ? (rdoAccrualPerDay * 52 * dpw) / (hpdPaid + rdoAccrualPerDay)
      : 0;
  const rdoHoursAnnual = rdoDaysAnnual * hpdPaid;

  // --- Hours (lines 82-86) ---
  const bHrs = billableWk * hpw + rdoHoursAnnual;
  const tHrs = 52 * hpw;
  const trainHrs = trainWk * hpw;
  const nonBillHrs = tHrs - bHrs - trainHrs;

  // --- Per-hour rates (lines 88-94) ---
  // tafeDayAmortizationPerHour is added AFTER the oncost divide so it
  // does not compound through super, WC, or payroll tax.
  const tafeDayAmortPH = cfg.tafeDayAmortizationPerHour ?? 0;
  const billedWage = (recv * tHrs) / bHrs;
  /** Unloaded counterpart of `billedWage` — see `recvBase`. */
  const billedWageBase = (recvBase * tHrs) / bHrs;
  const ordCost = totCost / bHrs + tafeDayAmortPH;
  const billedOnc = ordCost - billedWage;
  const marginPH =
    marginType === 'percent' ? ordCost * (marginVal / 100) : marginVal;
  const quoted = ordCost + marginPH;

  // --- OT base (lines 96-101) ---
  const otOnc = (totAnnPay * otOncostFactor) / bHrs;
  const otSuperPH = superOnOT ? superBearingRate * superRate : 0;
  const ot1x = recv + marginPH + otOnc;
  /** Unloaded counterpart of `ot1x` — see `recvBase`. */
  const ot1xBase = recvBase + marginPH + otOnc;

  // --- Penalty oncosts (line 103) ---
  const penOnc = (study + ppe + wc) / bHrs + penaltyOncostAdder;

  // --- Funding (lines 105-113) ---
  const fundingTotal = funding.enabled
    ? funding.milestones.reduce((s, m) => s + m.amount, 0)
    : 0;
  const totalBillableHrsApp = bHrs * (funding.apprenticeshipYears || appYears);
  let fundingPH = 0;
  if (funding.method === 'reduce' && totalBillableHrsApp > 0) {
    fundingPH = fundingTotal / totalBillableHrsApp;
  } else if (funding.method === 'passPercent' && totalBillableHrsApp > 0) {
    fundingPH =
      (fundingTotal * (funding.passPercentage / 100)) / totalBillableHrsApp;
  }
  // 'passThrough' = no charge rate impact

  // --- Per-hour oncost breakdown (lines 116-125) ---
  const oncAL = alPay / bHrs;
  const oncPH = phPay / bHrs;
  const oncSick = persLeave / bHrs;
  const oncTafe = tafePay / bHrs;
  const oncStudy = study / bHrs;
  const oncPPE = ppe / bHrs;
  const oncSuper = superAmt / bHrs;
  const oncWC = wc / bHrs;
  const oncOH = oh / bHrs;
  const oncPayrollTax = payrollTaxAmt / bHrs;
  const totOnc =
    oncAL +
    oncPH +
    oncSick +
    oncTafe +
    oncStudy +
    oncPPE +
    oncSuper +
    oncWC +
    oncOH +
    oncPayrollTax;

  // --- Build rates (lines 127-142) ---
  const rates: Record<string, RateResult> = {};
  const ratesByPayItemGroupId: Record<string, RateResult> = {};
  const ordinaryRate = resolveRateKey(
    'ord',
    cfg.ordinaryPayItemGroupId,
    cfg.ordinaryPayItemGroup,
    'ordinary',
  );
  assignRate(rates, ratesByPayItemGroupId, ordinaryRate.key, 'ord', {
    charge: quoted,
    funded: quoted - fundingPH,
    funding: fundingPH,
    payItemGroupId: ordinaryRate.payItemGroupId,
    payItemGroup: ordinaryRate.payItemGroup,
    sourceRateId: 'ord',
    label: ordinaryRate.payItemGroup?.name ?? 'Ordinary Time',
    category: ordinaryRate.category ?? 'ordinary_time',
  });

  /**
   * Award this `penalties` table was sourced from — only consulted for a
   * CASUAL worker, to resolve how each row's standard percentage converts
   * (additive vs multiplicative on the loaded rate; award/category-specific,
   * never assumed — see `awards/casual-penalty-convention.ts`). Defaults to
   * MA000020, the sector this package was built for, exactly like R80.4's
   * own resolver does — never silently applied to a DIFFERENT award's rows
   * without going through `casualPenaltyMultiplierForAward`'s own refusal.
   */
  const resolvedAwardCode = (awardCode || 'MA000020').toUpperCase().trim() || 'MA000020';
  const casualPenaltyViolations: string[] = [];

  for (const pr of penalties) {
    const rateKey = resolveRateKey(
      pr.id,
      pr.payItemGroupId,
      pr.payItemGroup,
      `penalties[${pr.id}]`,
    );

    /**
     * `effMult` is the multiplier actually applied below. For a non-casual
     * it is exactly `pr.mult` (the standard award percentage). For a casual
     * it is the AWARD'S OWN verified casual conversion — additive
     * (+25 percentage points) or multiplicative (x1.25 on the loaded rate)
     * depending on award and category — resolved against `billedWageBase`/
     * `ot1xBase` (the UNLOADED wage) below, never against `billedWage`/
     * `ot1x` (which already carry the 25% loading once, for ordinary
     * hours). Combining a loaded wage with a standard percentage is
     * exactly the double-count this module exists to prevent.
     *
     * `casualPenaltyMultiplierForAward` THROWS — never returns a wrong
     * number — when the (award, category) pair has not been individually
     * verified. That refusal is caught HERE, per row: the row is left OUT
     * of `rates` entirely (never a default, never zero — see
     * `CalcResult.casualPenaltyViolations`) rather than silently priced
     * under an assumed convention.
     */
    let effMult = pr.mult;
    if (isCasual) {
      try {
        effMult = casualPenaltyMultiplierForAward({
          award: resolvedAwardCode,
          category: pr.cat,
          standardMult: pr.mult,
          isPublicHoliday: pr.id === 'ph',
          penaltyId: pr.id,
        }).multiplier;
      } catch (e) {
        if (!(e instanceof CasualPenaltyConventionUnmodelled)) throw e;
        casualPenaltyViolations.push(
          `${pr.label || pr.id}: cannot price a CASUAL under ${resolvedAwardCode} — ${e.message}`,
        );
        continue; // No rates[pr.id] entry — refused, not wrong.
      }
    }

    if (pr.cat === 'overtime') {
      const otCharge =
        ot1xBase * effMult + (superOnOT ? otSuperPH * (effMult - 1) : 0);
      assignRate(rates, ratesByPayItemGroupId, rateKey.key, pr.id, {
        charge: otCharge,
        funded: otCharge,
        funding: 0,
        payItemGroupId: rateKey.payItemGroupId,
        payItemGroup: rateKey.payItemGroup,
        sourceRateId: pr.id,
        label: pr.payItemGroup?.name ?? pr.label,
        category: rateKey.category,
      });
    } else if (pr.cat === 'penalty') {
      const penCharge =
        (48 / 52) * penOnc * effMult + billedWageBase * effMult + marginPH;
      assignRate(rates, ratesByPayItemGroupId, rateKey.key, pr.id, {
        charge: penCharge,
        funded: penCharge - fundingPH,
        funding: fundingPH,
        payItemGroupId: rateKey.payItemGroupId,
        payItemGroup: rateKey.payItemGroup,
        sourceRateId: pr.id,
        label: pr.payItemGroup?.name ?? pr.label,
        category: rateKey.category,
      });
    }
  }

  // --- Oncost breakdown ---
  const oncosts: OncostBreakdown = {
    annualLeave: oncAL,
    publicHolidays: oncPH,
    sickLeave: oncSick,
    training: oncTafe,
    study: oncStudy,
    ppe: oncPPE,
    superannuation: oncSuper,
    workersComp: oncWC,
    overhead: oncOH,
    payrollTax: oncPayrollTax,
    tafeAmortization: tafeDayAmortPH,
    total: totOnc + tafeDayAmortPH,
  };

  return {
    receivedWagePerHour: recv,
    weeklyPay: wkPay,
    workedPay: worked,
    trainingPay: tafePay,
    annualLeavePay: alPay,
    sickLeavePay: persLeave,
    publicHolidayPay: phPay,
    totalAnnualPay: totAnnPay,
    superAmount: superAmt,
    workersCompAmount: wc,
    overheadAmount: oh,
    totalAnnualCost: totCost,
    trainingFeesAnnual: trainingFees,
    billableHours: bHrs,
    rdoDaysAnnual,
    rdoHoursAnnual,
    totalHours: tHrs,
    trainingHours: trainHrs,
    nonBillableHours: nonBillHrs,
    billedWagePerHour: billedWage,
    billedOncostPerHour: billedOnc,
    costPerHour: ordCost,
    marginPerHour: marginPH,
    quotedChargeRate: quoted,
    otBase1x: ot1x,
    otOncostPerHour: otOnc,
    penaltyOncostPerHour: penOnc,
    oncosts,
    fundingPerHour: fundingPH,
    fundingTotal,
    totalBillableHoursApprentice: totalBillableHrsApp,
    annualLeaveWeeks: alWk,
    publicHolidayWeeks: phWk,
    sickLeaveWeeks: sickWk,
    impliedBillableWeeks: impliedBillable,
    allowancePerHour: allowPerHour,
    allowanceSuperPerHour: allowPerHourSuper,
    rates,
    ratesByPayItemGroupId,
    ordinaryRateKey: ordinaryRate.key,
    casualPenaltyViolations,
  };
}
