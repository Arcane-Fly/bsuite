/**
 * THE ENGINE. One pure function: config in, costed result out.
 *
 * PORTED VERBATIM from R80.4 src/awards/calculate.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294 (2026-08-05T21:06:19+08:00, branch
 * development). R80.4 is read-only source to this port; this file is a
 * faithful copy, not a re-derivation. The operator has confirmed R80.4's
 * arithmetic is correct ("the calcs are good to go") — do not "fix" anything
 * here without going back to R80.4 first and reporting the discrepancy
 * separately. R80.4 is still being actively refined by another lane; re-sync
 * against a later commit by diffing this file against the upstream original.
 *
 * EXTRACTED from charge-calculator-v9-2.tsx on 2026-08-03, and the reason is the
 * whole point rather than tidiness. While calculate() lived inside a .tsx it
 * could not be imported by a plain `node --test` run, so it had no direct test —
 * and a rounding defect that mispriced 21 of 27 sampled classifications survived
 * a fully green suite, because the tests re-derived the arithmetic instead of
 * calling this code.
 *
 * Nothing may be added here that needs React. This file is the contract the
 * remaining awards fan out from, and it stays testable.
 */

import { round2 } from "./round.js";
import { ordinaryWage } from "./ordinary-wage-breakdown.js";
import { minimumEngagementFor } from "./ma000020-minimum-engagement.js";
import { dailyHireOrdinaryHourly } from "./ma000020-daily-hire.js";
import { leadingHandAmount } from "./ma000020-supervision.js";
import { CASUAL, casualPenaltyMultiplier } from "./contingent-costs.js";
import type {
  CalcConfig, CalcResult, AllowanceRow, AllowanceDetail, PenaltyRow, RateEntry,
} from "./calc-types.js";

export function calculate(cfg: CalcConfig): CalcResult {
  const {
    wage, allowances, superRate, wcRate, wcOnAllWages = false, leaveLoad, profitType, profitVal,
    ohType, ohVal, dpw, trainWk,
    autoWeeks, manualBw, appYears, superOnOT,
    empType, workedPW, rdoIncluded, rdoAccrual, ptHours,
    engagement = "apprentice", engagedAsDailyHire = false, leadingHand,
    leaveIsProRated,
    // One resolved object covering EVERY funding scheme. Each scheme carries its
    // own particulars — its own milestones, pass-through method and spread — so
    // there is no single global funding setting to pass any more.
    funding, fundYearSel, shiftLoading = 1, continuousShiftworker = false,
    study, ppe, penalties, allowanceFactor,
  } = cfg;

  /* — Hours derivation — */
  // Full-time: enter hours WORKED; if RDO included, paid = worked − accrual
  // Part-time: enter hours worked = hours paid (no RDO bank)
  /* Mutable because cl.12.1/12.4 zero them for a casual — the 25% loading IS
     the compensation for annual leave, personal leave and public holidays not
     worked, so costing them again charges the host twice. */
  let { alDays, phDays, sickDays } = cfg;

  /* OPERATOR RULING 2026-08-03: "apprentices and trainees can only be full time
     or part time." GTOs do place casuals — as LABOUR HIRE WORKERS, not under a
     training contract.

     This was UI text only ("casual employment is prohibited") and the engine did
     not enforce it, so a caller could price an apprentice as a casual: +25%
     loading they are not entitled to, and their annual leave, personal leave and
     public holidays stripped out because the loading is deemed to compensate for
     them. Both wrong, in opposite directions, on the same placement.

     The engine REFUSES the casual treatment rather than throwing. Throwing would
     crash a UI mid-keystroke; silently coercing would hide it. So the figure
     returned is the correct permanent-employment one, and the violation travels
     with the result where a caller must deal with it. */
  const violations: string[] = [];
  const trainingContract = engagement === "apprentice" || engagement === "trainee";
  const isCasual = empType === "casual" && !trainingContract;

  if (empType === "casual" && trainingContract) {
    violations.push(
      `An ${engagement} cannot be engaged as a CASUAL — a training contract requires ` +
      `full-time or part-time employment (cl.14, and the operator's standing ruling). ` +
      `The casual loading and the leave exclusions have NOT been applied; this ` +
      `placement has been costed as permanent. Fix the engagement before quoting.`,
    );
  }
  const isPT = empType === "partTime";
  const effWorkedPW = isPT ? ptHours : workedPW;
  const effRdo = (!isPT && rdoIncluded) ? rdoAccrual : 0;
  const paidPW = effWorkedPW - effRdo;
  const hpdPaid = paidPW / dpw;      // paid hours per day
  const hpdWorked = effWorkedPW / dpw;

  const paidHours = 52 * paidPW;
  /* ORDINARY HOURS for weekly->hourly allowance conversion. MA000020 cl.2:
     "for apprentices, the weekly rate ... divided by 38". Operator 2026-08-03:
     "its allowance / ordinary hours". This is NOT paidPW — a full-timer banking
     an RDO is paid 36 but their ordinary hours remain 38, and dividing a capped
     weekly allowance by 36 would over-state the hourly figure. Part-time uses
     the agreed hours, which ARE that employee's ordinary hours. */
  /* MA000020 cl.11.2: "For each ordinary hour worked, a part-time employee will
     be paid no less than the ORDINARY HOURLY RATE for the relevant
     classification and pro rata entitlements for those hours." So a part-timer
     is on the SAME ordinary hourly rate as a full-timer — the pro-rating happens
     through working fewer hours, not through a higher rate.

     This divisor is therefore the AWARD's ordinary hours (38), never the
     individual's contracted week. Dividing a full weekly allowance by a shorter
     week double-counts the pro-rata: a 20-hour part-timer had $67.15/wk become
     $3.36/hr instead of $1.77/hr, inflating the ordinary rate and every penalty
     derived from it by ~90%. Red-team finding, 2026-08-03. */
  const ordinaryPW = 38;



  /* — Weeks (before allowances — worked-only allowances need billable time) — */
  /* cl.31.1(b): a CONTINUOUS shiftworker gets the NES additional week — 5 weeks
     rather than 4. Applied as an extra week's worth of days at the same daily
     pattern, so it flows through billable weeks and the leave cost together. */
  /* LEAVE IS PRO-RATED BY DAYS PER WEEK, AND IT WAS NOT.
     The NES expresses annual leave in WEEKS (4, or 5 for a continuous
     shiftworker) — not days. Personal/carer's leave and the public holiday
     entitlement are day-counts for a 5-day week and pro-rate to the days a
     part-timer actually works (cl.11.2: "pro rata entitlements for those hours").

     The old code took the raw day counts and divided by dpw, so a 3-day-a-week
     part-timer on the default alDays=20 was credited 20/3 = 6.67 WEEKS of annual
     leave instead of 4. That cut billable weeks, which inflated the hourly rate,
     which OVER-CHARGED the host by roughly $2,300 a year on a single placement —
     while a comment three lines up claimed "auto pro-rata for PT".

     `leaveIsProRated: false` opts out for a caller who has already pro-rated the
     day counts themselves, so an existing correct configuration is not broken. */
  /* cl.12.1/12.4 — a CASUAL is not entitled to annual leave, paid personal
     leave, community service leave, notice, redundancy, or payment for public
     holidays not worked, BECAUSE the 25% loading is compensation for exactly
     those. Costing them as well charges the host twice for one entitlement. */
  if (isCasual) { alDays = 0; sickDays = 0; phDays = 0; }

  const FULL_TIME_DPW = 5;
  const proRate = leaveIsProRated !== false && dpw < FULL_TIME_DPW;
  const scale = proRate ? dpw / FULL_TIME_DPW : 1;

  // Annual leave is WEEKS in the NES, so it converts to this employee's days.
  const alWeeksEntitled = continuousShiftworker ? 5 : 4;
  const baseAlDays = proRate ? alWeeksEntitled * dpw : alDays;
  const effAlDays = proRate
    ? baseAlDays
    : (continuousShiftworker ? alDays + dpw : alDays);

  const effPhDays = round2(phDays * scale);
  const effSickDays = round2(sickDays * scale);

  const alWk = effAlDays / dpw;
  const phWk = effPhDays / dpw;
  const sickWk = effSickDays / dpw;
  const bwAuto = 52 - alWk - phWk - sickWk - trainWk;
  const bw = autoWeeks ? bwAuto : manualBw;

  /* RDO ACCRUAL — cl.16.2 AND cl.16.3(a) TOGETHER.
     cl.16.2: "0.4 of one hour of each day worked will accrue towards an RDO and
     7.6 hours will be paid... an employee will therefore accrue 7.6 hours
     towards an RDO each 19 days of ordinary hours worked."
     cl.16.3(a): "An employee will accrue 0.4 of one hour of each day towards an
     RDO for ANY PUBLIC HOLIDAY where an employee is not required to work AND FOR
     EACH DAY OF PAID LEAVE TAKEN. This will not apply on a day an employee takes
     an RDO."

     So accrual continues through public holidays and paid leave, and stops only
     on RDO days themselves. I got this wrong twice in one day and both errors
     are worth recording:
       - the original `effRdo x 52` over-accrued by counting RDO days themselves;
       - my "correction" to `effRdo x bw` UNDER-accrued badly, by stripping the
         accrual cl.16.3(a) expressly grants on leave and public holidays. It
         read plausibly ("you don't earn RDO while on leave") and is the exact
         opposite of what the clause says. Caught by a Fable-tier red team.

     The award's own arithmetic is self-solving. With D paid days in the year and
     r RDO days, every non-RDO day accrues 0.4h and each RDO costs 7.6h:
         0.4 x (D - r) = hpd x r      ->      r = 0.4D / (hpd + 0.4)
     At D = 260 and hpd = 7.6 that gives r = 13 days = 98.8 hours — which is
     exactly the 19-days-per-RDO the clause states. */
  const accrualPerDay = effRdo > 0 ? effRdo / dpw : 0;      // 2h/wk over 5 days = 0.4h
  const paidDaysAnnual = 52 * dpw;                          // RDO days come out below
  const rdoDaysAnnual = accrualPerDay > 0
    ? (accrualPerDay * paidDaysAnnual) / (hpdPaid + accrualPerDay)
    : 0;
  const rdoHrsAnnual = round2(rdoDaysAnnual * hpdPaid);

  /* Billable hours: the weeks actually at the host, plus the RDO bank when
     taken. The RDO hours are billable because the host has already had the
     work — the employee banked 0.4h of every 8h day they were on site. */
  const bHrs = bw * paidPW + rdoHrsAnnual;
  const workedBillHrs = bw * paidPW;
  const workedDays = bw * dpw;

  /* — Allowances: split by basis —
     allPurpose  → part of the ordinary rate; paid on ALL paid hours (incl leave/training)
     workedOnly  → paid only for time actually worked (meal/travel per day worked)   */
  let allowPH = 0, allowPHSuper = 0, workedOnlyAnnual = 0, workedOnlySuperAnnual = 0;
  let reimbursementAnnual = 0;
  // Discretionary pay that is NOT multiplied — recovered flat per billable hour.
  let discretionaryFlatPH = 0;
  /* OPERATOR RULING 2026-08-03 (supersedes an earlier misreading of mine):
     "if an allowance is defined as all purpose than it is considered as a part
     of the ordinary wage." An all-purpose allowance is converted to an hourly
     figure over ORDINARY hours and ADDED TO THE BASE WAGE to form the ORDINARY
     WAGE. Base $10/hr + $1 industry = $11/hr ordinary.
     The ordinary wage is then the base for penalties, loadings and overtime.
     I had briefly excluded weekly all-purpose allowances from that base on a
     "the weekly amount is capped so a multiplier would mint allowance" argument.
     That confused the allowance's weekly QUANTUM with the RATE it forms part
     of — the cap was wrong. */
  /* allowanceFactor is the apprentice's SHARE of an allowance for the year being
     costed — "percent_of_full_allowance", not "percent of the standard rate".
     It applies ONLY to allowances flagged apprenticeProp, because awards
     proportion specific allowances rather than all of them (MA000020 cl.26.5
     covers fares/travel and distant work only). Default is paid in full, which
     is what most GTOs do. Percent-type allowances are already a function of the
     wage, so they scale on their own and must NOT be scaled twice. */
  const termFactor = typeof allowanceFactor === "number" && Number.isFinite(allowanceFactor) && allowanceFactor > 0 ? allowanceFactor : 1;
  const allowanceDetails: AllowanceDetail[] = [];
  (allowances || []).filter((a: AllowanceRow) => a.enabled).forEach((a: AllowanceRow) => {
    const aFactor = a.apprenticeProp ? termFactor : 1;
    let needsQuantity = false;
    // per-paid-hour equivalent of the allowance amount
    let ph = 0;
    if (a.type === "perHour") ph = a.amount * aFactor;
    else if (a.type === "perDay") ph = (a.amount * aFactor) / hpdPaid;
    // Weekly allowances are CAPPED at the weekly amount, so the hourly
    // equivalent is amount / ORDINARY hours (38), never / paid hours.
    else if (a.type === "perWeek") ph = (a.amount * aFactor) / ordinaryPW;
    else if (a.type === "percent") ph = wage * (a.amount / 100);
    else if (a.type === "perKm") {
      /* A $/km allowance is NOT a $/hr allowance. Treating $1.00/km as $1.00/hr
         fabricates a number that happens to look plausible, which is the worst
         kind of wrong — it never trips an obvious sanity check.

         The conversion needs DISTANCE: (rate x km per week) / paid hours. Where
         no distance has been entered the contribution is ZERO and the row is
         flagged needsQuantity, so the gap is visible on the breakdown rather
         than silently priced. Red-team finding, 2026-08-03. */
      const kmPerWeek = typeof a.qty === "number" && Number.isFinite(a.qty) ? a.qty : 0;
      ph = paidPW > 0 ? (a.amount * aFactor * kmPerWeek) / paidPW : 0;
      needsQuantity = kmPerWeek <= 0;
    }

    /* A DISCRETIONARY row carries its own treatment. attractsPenalties=false
       keeps it out of `recv`, so no multiplier touches it, while
       inOrdinaryWage=true still spreads it across all paid hours (leave,
       training, public holidays). Those are genuinely separable for a
       non-award payment and the host decides each one. */
    const disc = a.discretionary === true;
    const basis = a.basis || "allPurpose";
    let annual: number;
    if (basis === "reimbursement") {
      /* Restoring an out-of-pocket cost, not paying for labour. It is a real
         cash cost to the GTO and must be recovered in the charge rate, but it
         is NOT wages — no super, no workers comp, and it never enters the
         ordinary wage. Operator ruling: "reimbursory no super", and WC follows
         super. */
      annual = ph * workedBillHrs;
      reimbursementAnnual += annual;
    } else if (basis === "workedOnly") {
      // costed against worked billable time only — NOT paid during leave/training
      annual = ph * workedBillHrs; // e.g. $17.50/day × worked days
      workedOnlyAnnual += annual;
      if (a.superApplicable) workedOnlySuperAnnual += annual;
    } else {
      annual = ph * paidHours;     // paid across all 52 paid weeks
      if (disc) {
        // Only enters the multiplied ordinary wage if the host says it does.
        if (a.attractsPenalties) allowPH += ph;
        else discretionaryFlatPH += ph;
        if (a.attractsSuper) allowPHSuper += ph;
      } else {
        allowPH += ph;
        if (a.superApplicable) allowPHSuper += ph;
      }
    }
    const chargePH = annual / bHrs;       // contribution to the ordinary charge per billable hour
    allowanceDetails.push({ id: a.id, name: a.name, type: a.type, basis, ph, annual, chargePH, superApplicable: a.superApplicable, apprenticeProp: !!a.apprenticeProp, factorUsed: aFactor, needsQuantity });
  });

  /* THE ORDINARY WAGE. Base wage plus every all-purpose allowance, per hour.
     This — not the base wage — is what penalties, loadings and overtime are
     calculated on, and what an apprentice is paid while attending training, on
     a public holiday not worked, and on personal leave. */
  /* ROUNDED ONCE, HERE. Ruling 7: the ordinary hourly rate is rounded to the
     cent BEFORE any multiplier is applied — that is what PACT does, and the
     penalty figures only reconcile to the published dollars if it happens at
     this point rather than on the wage component upstream. */
  /* LEADING HAND (cl.19.2) — ALL PURPOSE per cl.2, so it belongs INSIDE the
     ordinary wage, not beside it. Calculated on the higher of the leading hand's
     own rate and the highest classification they supervise. */
  const lh = leadingHand
    ? leadingHandAmount({
        personsInCharge: leadingHand.personsInCharge,
        highestSupervisedWeekly: leadingHand.highestSupervisedWeekly ?? wage * ordinaryPW,
        ownWeekly: wage * ordinaryPW,
        /* DO NOT apply the daily-hire conversion here. cl.19.2(b) converts the
           leading hand allowance ON ITS OWN; cl.19.3(a) converts the WHOLE
           ordinary hourly rate, which already contains it. Doing both applies
           52/50.4 twice to the same money — an over-charge to the host of about
           $0.06/hr that then compounds through every derived rate. Red team,
           2026-08-03. The carpenter-diver divisor is a different question and
           still belongs here: it changes what the allowance is divided BY. */
        dailyHire: false,
        carpenterDiver: leadingHand.carpenterDiver,
      })
    : null;

  const recv = ordinaryWage(wage, allowPH + (lh?.perHour ?? 0));

  /* DAILY HIRE (cl.19.3) — WORKERS ONLY. dailyHireApplies() refuses it for an
     apprentice or trainee regardless of the flag, so this cannot over-charge a
     training contract by the 52/50.4 factor. */
  const dailyHire = dailyHireOrdinaryHourly({
    weeklyRate: recv * ordinaryPW,
    engagement,
    engagedAsDailyHire,
  });
  const preCasual = dailyHire.applied ? dailyHire.ordinaryHourly : recv;

  /* cl.12.4 — the 25% casual loading on ordinary hours. */
  const ordinaryHourlyRate = isCasual ? round2(preCasual * (1 + CASUAL.loading)) : preCasual;
  const superBearing = wage + allowPHSuper;

  /* — Annual cost (single-count) — */
  const alHrs = effAlDays * hpdPaid;
  const phHrs = effPhDays * hpdPaid;
  const sickHrs = effSickDays * hpdPaid;
  const trainHrs = trainWk * paidPW;

  const baseWagesAnnual = wage * paidHours;
  const apAllowAnnual = allowPH * paidHours;
  const discretionaryAnnual = discretionaryFlatPH * paidHours;
  const annualWages = baseWagesAnnual + apAllowAnnual + discretionaryAnnual;
  // Annual leave: ordinary hours at the ORDINARY wage, plus loading ON the ordinary wage.
  /* MA000020 cl.31.2(c): the shift loading REPLACES the 17.5% where it would
     give a greater amount. So the annual-leave uplift is the GREATER of the two,
     never both. A civil afternoon/night 5-in-a-row shift is x1.15, which does
     NOT beat 1.175 — that worker still gets the 17.5% loading. A general
     building morning shift is x1.25 and does beat it. */
  const alUplift = Math.max(1 + leaveLoad, shiftLoading) - 1;
  const loadingCost = (recv * alHrs) * alUplift;
  const superBase = (superBearing * paidHours) + loadingCost + workedOnlySuperAnnual;
  const superAmt = superBase * superRate;

  /* OPERATOR RULING: "WC usually applied in same way as super." The comment here
     used to say exactly that while the code did the opposite — WC was charged on
     EVERY workedOnly allowance regardless of its super treatment, and on
     discretionary rows explicitly flagged attractsSuper:false. A meal allowance
     that correctly attracted no super still attracted a WC premium.

     WC now shares the super base by default. "Usually" is doing real work in the
     ruling, though: some WIC/scheme definitions of "wages" are broader than OTE,
     so the broader base stays available as an EXPLICIT election rather than a
     silent default. Red-team finding, 2026-08-03. */
  const wcBase = wcOnAllWages
    ? annualWages + workedOnlyAnnual
    : superBase;
  const wc = wcBase * wcRate;
  const oh = ohType === "percent" ? annualWages * (ohVal / 100) : ohVal;
  const totCost = annualWages + workedOnlyAnnual + reimbursementAnnual + loadingCost + superAmt + wc + study + ppe + oh;

  const ordCost = totCost / bHrs;

  /* — Profit — */
  const applyProfit = (cost: number): number => {
    if (profitType === "margin") return cost / (1 - profitVal / 100);
    if (profitType === "markup") return cost * (1 + profitVal / 100);
    return cost + profitVal;
  };
  const quoted = applyProfit(ordCost);
  const gpOrd = quoted - ordCost;
  const metrics = {
    margin: quoted > 0 ? ((quoted - ordCost) / quoted) * 100 : 0,
    markup: ordCost > 0 ? ((quoted - ordCost) / ordCost) * 100 : 0,
    grossProfit: quoted - ordCost,
  };

  /* — OT: WC only (+ optional super) — */
  const wcPH = recv * wcRate;
  const superOTPH = superOnOT ? superBearing * superRate : 0;

  /* — Funding — */
  // When training weeks vary per year, billable hours vary per year — the term
  // divisor must be the SUM of each year's actual billable hours, not bHrs × years
  const totalOrdHrsApp = cfg.termHoursOverride ?? (bHrs * appYears);

  // Every scheme is resolved independently in the component (each has its own
  // pass-through method and spread) and combined there. calculate() consumes the
  // combined result rather than re-deriving it, so there is exactly one place
  // funding arithmetic happens.
  const termPH = funding?.termPerHour ?? 0;
  const yearlyPH = funding?.yearlyPerHour ?? [];
  const fundingTotal = funding?.totalFunding ?? 0;
  const fundingPH = fundYearSel === "avg"
    ? (funding?.perHourAvg ?? 0)
    : (funding?.perHourByYear?.[(fundYearSel as number) - 1] ?? funding?.perHourAvg ?? 0);

  /* — Per-hour composition —
     Each paid-time row is costed at the ORDINARY WAGE (`recv` = base + every
     all-purpose allowance), because that is what the apprentice is actually paid
     for that time. These rows previously used the BASE wage and pushed the
     all-purpose share into a single "Allowances" line, which understated every
     one of them: a reader saw "Annual Leave $2.58" when leave genuinely costs
     the ordinary wage.
     `oncAllowances` now carries ONLY the allowances that are NOT in the ordinary
     wage — worked-only, reimbursements and non-multiplied discretionary pay —
     so nothing is counted twice. */
  const oncWage = (recv * workedBillHrs) / bHrs;
  const oncAL = (recv * alHrs) / bHrs;
  const oncLoad = loadingCost / bHrs;
  const oncPHol = (recv * phHrs) / bHrs;
  const oncSick = (recv * sickHrs) / bHrs;
  const oncTrain = (recv * trainHrs) / bHrs;
  const oncAllowances = (workedOnlyAnnual + reimbursementAnnual + discretionaryFlatPH * paidHours) / bHrs;
  const oncStudy = study / bHrs;
  const oncPPE = ppe / bHrs;
  const oncSuper = superAmt / bHrs;
  const oncWC = wc / bHrs;
  const oncOH = oh / bHrs;
  const totOnc = ordCost - oncWage;

  /* — Rates — */
  const rates: Record<string, RateEntry> = { ord: { cost: ordCost, charge: quoted, funded: quoted - fundingPH, funding: fundingPH } };
  /* OPERATOR RULING 2026-08-03: "OT, Pen, loadings, calculated on ordinary wage."
     The ORDINARY WAGE is the base wage plus every all-purpose allowance.

     FUNDING, same ruling: "funding is applied flat to ordinary billable hours or
     passed through direct. it isnt impacted by percentages etc. i.e. this person
     attracts X dollars worth of funding ... is not applied to OT."
       - It is a DOLLAR AMOUNT, not a percentage. The apprentice stage scale does
         NOT touch it — a stage 1 apprentice attracts the same incentive dollars
         as a stage 4 one unless the programme itself says otherwise.
       - It is divided by ORDINARY BILLABLE hours to get a flat $/hr, and that
         flat figure is deducted. It is never multiplied by a penalty factor —
         a public holiday does not attract 2.5x the funding.
       - It is NOT applied to OVERTIME at all. Overtime hours are outside the
         ordinary billable hours the funding was divided by, so crediting funding
         against them would spend the same dollars twice.

     PENALTY hours are ORDINARY hours with a multiplier — the apprentice is still
     within ordinary weekly hours, so everything the ordinary rate already
     provides for (leave accrual, study, PPE, admin overheads, and every
     allowance) is ALREADY fully recovered and must NOT be multiplied again.
     Only the WAGE is multiplied, and only the on-costs that genuinely scale
     with wages (super, workers comp) follow it up.
       previously: ordCost x mult — which charged 2.5x the ADMIN OVERHEAD and
       2.5x the PPE for a public holiday. Those do not scale.

     OVERTIME is not ordinary time: no leave accrues, no overheads are recovered
     against it, and it carries workers comp plus super only where elected. */
  const wageOncostRate = wcRate + (superOnOT ? superRate : 0);

  /* MINIMUM ENGAGEMENTS (cl.30.2, cl.24.5, cl.17). A rate is only half the
     price — the award also guarantees a floor of PAID HOURS. A one-hour Sunday
     call-in is a FOUR hour bill, so a quote that shows the Sunday rate without
     its minimum understates the real cost of a call-in by 300%.

     Carried on every rate row so a quote or invoice can state it, rather than
     living in a module nothing reads. */
  const RATE_MINIMUMS: Record<string, string> = {
    sunday: "sun_overtime",
    satgf: "sat_good_friday",
    sat_ot: "sat_overtime",
    ph: "public_holiday",
  };
  const minFor = (id: string) => {
    const m = minimumEngagementFor(RATE_MINIMUMS[id] ?? "");
    return m ? { minimumHours: m.minimumHours, minimumClause: m.clause } : {};
  };
  /* cl.12.5/12.6 — a casual's penalty is ADDITIVE, not compounded: where the
     standard rate is 150% the casual gets 175%, and a public holiday is 275%
     rather than 250% x 1.25. Applying the loading twice (once in the rate, once
     in the multiplier) would over-charge every casual penalty hour. */
  const effMult = (pr: PenaltyRow): number => {
    if (!isCasual) return pr.mult;
    return casualPenaltyMultiplier(pr.mult, pr.id === "ph").multiplier;
  };

  penalties.forEach((pr: PenaltyRow) => {
    if (pr.cat === "penalty") {
      // Multiplier applies to the ORDINARY WAGE (base + all-purpose allowances).
      // Only that uplift is multiplied — overheads, PPE and study are already
      // fully recovered in the ordinary rate and do not scale with a penalty.
      const extraWage = (isCasual ? preCasual : recv) * (effMult(pr) - 1);
      const cost = ordCost + extraWage + extraWage * (superRate + wcRate);
      const charge = applyProfit(cost);
      rates[pr.id] = { cost, charge, funded: charge - fundingPH, funding: fundingPH, ...minFor(pr.id) };
    } else {
      const otWage = (isCasual ? preCasual : recv) * effMult(pr);   // ORDINARY wage x multiplier
      const cost = otWage + otWage * wageOncostRate;
      const charge = applyProfit(cost);
      rates[pr.id] = { cost, charge, funded: charge, funding: 0, ...minFor(pr.id) };
    }
  });

  const annualRevenue = quoted * bHrs;

  return {
    isPT, effWorkedPW, effRdo, paidPW, hpdPaid, hpdWorked, paidHours, rdoHrsAnnual,
    recv, ordinaryHourlyRate, isCasual, violations, dailyHire, leadingHand: lh, allowPH, superBearing, allowanceDetails, workedOnlyAnnual, apAllowAnnual, baseWagesAnnual, workedDays,
    alWk, phWk, sickWk, effAlDays, effPhDays, effSickDays, bwAuto, bw, bHrs, workedBillHrs, trainHrs,
    annualWages, loadingCost, superAmt, superBase, wc, oh, totCost,
    ordCost, quoted, gpOrd, metrics,
    oncWage, oncAL, oncLoad, oncPHol, oncSick, oncTrain, oncAllowances,
    oncStudy, oncPPE, oncSuper, oncWC, oncOH, totOnc,
    wcPH, superOTPH, rates, fundingPH, termPH, yearlyPH, fundingTotal, totalOrdHrsApp,
    annualRevenue,
  };
}
