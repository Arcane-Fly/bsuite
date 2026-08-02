import type { NonMonetaryTerms, NonMonetaryDifference } from './types.js';

/**
 * Compare non-monetary terms between award and EA.
 * Flags detriments but does NOT auto-offset (per FWC guidance).
 *
 * For numeric terms: lower hours/spans are better for employees.
 * For string terms: presence of a provision is better than absence.
 * Both null = equivalent (neither provides the term).
 */
export function compareNonMonetary(
  award: NonMonetaryTerms,
  ea: NonMonetaryTerms,
): NonMonetaryDifference[] {
  const diffs: NonMonetaryDifference[] = [];

  // --- Ordinary hours per week ---
  // Lower is better for the employee
  diffs.push(
    compareNumericLowerBetter(
      'Ordinary hours per week',
      award.ordinaryHoursPerWeek,
      ea.ordinaryHoursPerWeek,
    ),
  );

  // --- Max daily ordinary hours ---
  // Lower is better (limits how long a single day can be)
  diffs.push(
    compareNullableNumericLowerBetter(
      'Max daily ordinary hours',
      award.maxDailyOrdinaryHours,
      ea.maxDailyOrdinaryHours,
    ),
  );

  // --- Span of hours ---
  // Narrower span is better for the employee
  diffs.push(compareSpanOfHours(award.spanOfHours, ea.spanOfHours));

  // --- Rostering notice ---
  // More notice is better — compare as string/presence
  diffs.push(
    compareRosteringNotice(award.rosteringNotice, ea.rosteringNotice),
  );

  // --- Minimum engagement hours ---
  // Higher is better for the employee (guarantees more pay per engagement)
  diffs.push(
    compareNullableNumericHigherBetter(
      'Minimum engagement hours',
      award.minimumEngagementHours,
      ea.minimumEngagementHours,
    ),
  );

  // --- Meal break after hours ---
  // Lower is better (get a break sooner)
  diffs.push(
    compareNullableNumericLowerBetter(
      'Meal break after hours',
      award.mealBreakAfterHours,
      ea.mealBreakAfterHours,
    ),
  );

  // --- Rest break minutes ---
  // Higher is better (longer rest)
  diffs.push(
    compareNullableNumericHigherBetter(
      'Rest break minutes',
      award.restBreakMinutes,
      ea.restBreakMinutes,
    ),
  );

  // --- Consultation obligations ---
  diffs.push(
    compareStringProvision(
      'Consultation obligations',
      award.consultationObligations,
      ea.consultationObligations,
    ),
  );

  // --- Dispute resolution ---
  diffs.push(
    compareStringProvision(
      'Dispute resolution',
      award.disputeResolution,
      ea.disputeResolution,
    ),
  );

  // --- Notice of termination ---
  diffs.push(
    compareStringProvision(
      'Notice of termination',
      award.noticeOfTermination,
      ea.noticeOfTermination,
    ),
  );

  return diffs;
}

// ─── Helpers ───

function compareNumericLowerBetter(
  term: string,
  awardVal: number,
  eaVal: number,
): NonMonetaryDifference {
  const awardStr = String(awardVal);
  const eaStr = String(eaVal);

  if (eaVal === awardVal) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  if (eaVal < awardVal) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: `EA provides ${awardVal - eaVal} fewer` };
  }
  return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'worse', notes: `EA requires ${eaVal - awardVal} more` };
}

function compareNullableNumericLowerBetter(
  term: string,
  awardVal: number | null,
  eaVal: number | null,
): NonMonetaryDifference {
  const awardStr = awardVal != null ? String(awardVal) : 'Not specified';
  const eaStr = eaVal != null ? String(eaVal) : 'Not specified';

  // Both null = equivalent
  if (awardVal == null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  // Award has provision, EA does not
  if (awardVal != null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'missing', notes: 'EA does not specify this provision' };
  }
  // EA has provision, award does not — better (EA adds a limit)
  if (awardVal == null && eaVal != null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA adds a limit not in the award' };
  }

  // Both specified: lower is better
  if (eaVal! === awardVal!) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  if (eaVal! < awardVal!) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: null };
  }
  return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'worse', notes: null };
}

function compareNullableNumericHigherBetter(
  term: string,
  awardVal: number | null,
  eaVal: number | null,
): NonMonetaryDifference {
  const awardStr = awardVal != null ? String(awardVal) : 'Not specified';
  const eaStr = eaVal != null ? String(eaVal) : 'Not specified';

  // Both null = equivalent
  if (awardVal == null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  // Award has provision, EA does not
  if (awardVal != null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'missing', notes: 'EA does not specify this provision' };
  }
  // EA has provision, award does not — better (EA adds a benefit)
  if (awardVal == null && eaVal != null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA adds a provision not in the award' };
  }

  // Both specified: higher is better
  if (eaVal! === awardVal!) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  if (eaVal! > awardVal!) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: null };
  }
  return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'worse', notes: null };
}

function compareSpanOfHours(
  awardSpan: { start: string; end: string },
  eaSpan: { start: string; end: string },
): NonMonetaryDifference {
  const awardStr = `${awardSpan.start} to ${awardSpan.end}`;
  const eaStr = `${eaSpan.start} to ${eaSpan.end}`;

  if (awardSpan.start === eaSpan.start && awardSpan.end === eaSpan.end) {
    return { term: 'Span of hours', awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }

  // Narrower span (later start, earlier end) is better for employee
  const eaStartMinutes = timeToMinutes(eaSpan.start);
  const eaEndMinutes = timeToMinutes(eaSpan.end);
  const awardStartMinutes = timeToMinutes(awardSpan.start);
  const awardEndMinutes = timeToMinutes(awardSpan.end);

  const eaWidth = eaEndMinutes - eaStartMinutes;
  const awardWidth = awardEndMinutes - awardStartMinutes;

  if (eaWidth < awardWidth) {
    return { term: 'Span of hours', awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA has narrower span of hours' };
  }
  if (eaWidth > awardWidth) {
    return { term: 'Span of hours', awardProvision: awardStr, eaProvision: eaStr, assessment: 'worse', notes: 'EA has wider span of hours' };
  }
  // Same width but different times
  return { term: 'Span of hours', awardProvision: awardStr, eaProvision: eaStr, assessment: 'different', notes: 'Same width but different times' };
}

function compareRosteringNotice(
  awardNotice: string | null,
  eaNotice: string | null,
): NonMonetaryDifference {
  const awardStr = awardNotice ?? 'Not specified';
  const eaStr = eaNotice ?? 'Not specified';

  if (awardNotice == null && eaNotice == null) {
    return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  if (awardNotice != null && eaNotice == null) {
    return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'missing', notes: 'EA does not specify rostering notice' };
  }
  if (awardNotice == null && eaNotice != null) {
    return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA provides rostering notice not in award' };
  }

  // Both specified: try to extract number of days for comparison
  const awardDays = extractDays(awardNotice!);
  const eaDays = extractDays(eaNotice!);

  if (awardDays != null && eaDays != null) {
    if (eaDays === awardDays) {
      return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
    }
    if (eaDays > awardDays) {
      return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA provides more notice' };
    }
    return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'worse', notes: 'EA provides less notice' };
  }

  // Can't parse numerically: compare strings
  if (awardNotice === eaNotice) {
    return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  return { term: 'Rostering notice', awardProvision: awardStr, eaProvision: eaStr, assessment: 'different', notes: 'Cannot determine which is better' };
}

function compareStringProvision(
  term: string,
  awardVal: string | null,
  eaVal: string | null,
): NonMonetaryDifference {
  const awardStr = awardVal ?? 'Not specified';
  const eaStr = eaVal ?? 'Not specified';

  if (awardVal == null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  if (awardVal != null && eaVal == null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'missing', notes: 'EA does not specify this provision' };
  }
  if (awardVal == null && eaVal != null) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'better', notes: 'EA adds a provision not in the award' };
  }
  if (awardVal === eaVal) {
    return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'equivalent', notes: null };
  }
  return { term, awardProvision: awardStr, eaProvision: eaStr, assessment: 'different', notes: 'Provisions differ; manual review required' };
}

/** Parse "HH:MM" to minutes since midnight */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/** Extract leading integer from a string like "7 days" or "14 days" */
function extractDays(notice: string): number | null {
  const leading = /^(\d+)/.exec(notice);
  return leading ? Number(leading[1]) : null;
}
