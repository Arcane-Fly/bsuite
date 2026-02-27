/** Round monetary value to specified decimal places (default 4 for intermediates). */
export function roundMoney(value: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
