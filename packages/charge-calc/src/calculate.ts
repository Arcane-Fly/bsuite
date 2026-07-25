import type {
  CalcConfig,
  CalcResult,
  PayItemGroupRef,
  PayItemCategory,
  RateResult,
  OncostBreakdown,
  Allowance,
} from './types';

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

  // --- Hours (lines 82-86) ---
  const bHrs = billableWk * hpw;
  const tHrs = 52 * hpw;
  const trainHrs = trainWk * hpw;
  const nonBillHrs = tHrs - bHrs - trainHrs;

  // --- Per-hour rates (lines 88-94) ---
  // tafeDayAmortizationPerHour is added AFTER the oncost divide so it
  // does not compound through super, WC, or payroll tax.
  const tafeDayAmortPH = cfg.tafeDayAmortizationPerHour ?? 0;
  const billedWage = (recv * tHrs) / bHrs;
  const ordCost = totCost / bHrs + tafeDayAmortPH;
  const billedOnc = ordCost - billedWage;
  const marginPH =
    marginType === 'percent' ? ordCost * (marginVal / 100) : marginVal;
  const quoted = ordCost + marginPH;

  // --- OT base (lines 96-101) ---
  const otOnc = (totAnnPay * otOncostFactor) / bHrs;
  const otSuperPH = superOnOT ? superBearingRate * superRate : 0;
  const ot1x = recv + marginPH + otOnc;

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

  for (const pr of penalties) {
    const rateKey = resolveRateKey(
      pr.id,
      pr.payItemGroupId,
      pr.payItemGroup,
      `penalties[${pr.id}]`,
    );
    if (pr.cat === 'overtime') {
      const otCharge =
        ot1x * pr.mult + (superOnOT ? otSuperPH * (pr.mult - 1) : 0);
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
        (48 / 52) * penOnc * pr.mult + billedWage * pr.mult + marginPH;
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
  };
}
