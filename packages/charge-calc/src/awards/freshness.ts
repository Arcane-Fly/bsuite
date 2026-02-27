export interface RateFreshness {
  isStale: boolean;
  lastUpdated: Date | null;
  currentFY: number;
  rateFY: number;
  warningMessage: string | null;
}

/** Get current Australian financial year for a date.
 *  FY runs July 1 to June 30. FY2025 = July 2024 - June 2025.
 *  MUST be a function call, not a module constant (red-team D-3). */
export function getFinancialYear(date: Date = new Date()): number {
  const month = date.getMonth(); // 0-indexed (0=Jan, 6=Jul)
  const year = date.getFullYear();
  // July onwards = next FY (e.g., July 2024 = FY2025)
  return month >= 6 ? year + 1 : year;
}

/** Check if award rates are fresh for a given assessment date */
export function checkRateFreshness(
  rateEffectiveFrom: string, // ISO date string
  assessmentDate: Date = new Date(),
  maxStaleDays: number = 30,
): RateFreshness {
  const rateDate = new Date(rateEffectiveFrom);
  const daysDiff = Math.floor(
    (assessmentDate.getTime() - rateDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const currentFY = getFinancialYear(assessmentDate);
  const rateFY = getFinancialYear(rateDate);

  const isStale = daysDiff > maxStaleDays || rateFY < currentFY;

  let warningMessage: string | null = null;
  if (rateFY < currentFY) {
    warningMessage = `Rate is from FY${rateFY} but current FY is FY${currentFY}. Rates may have been updated.`;
  } else if (daysDiff > maxStaleDays) {
    warningMessage = `Rate was last updated ${daysDiff} days ago (threshold: ${maxStaleDays} days).`;
  }

  return {
    isStale,
    lastUpdated: rateDate,
    currentFY,
    rateFY,
    warningMessage,
  };
}
