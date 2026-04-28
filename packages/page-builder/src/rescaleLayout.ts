import type { GridLayoutItem, GridLayouts } from './types.js';

/**
 * Rescale a grid layout from one column count to another without overlapping
 * row siblings. Items keep their row order and wrap cleanly when the new column
 * count is narrower.
 */
export function rescaleLayout(layouts: GridLayouts, fromCols: number, toCols: number): GridLayouts {
  if (fromCols === toCols || !layouts.lg) return layouts;

  const sorted = [...layouts.lg].sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
  const rowMap = new Map<number, GridLayoutItem[]>();

  for (const item of sorted) {
    if (!rowMap.has(item.y)) rowMap.set(item.y, []);
    rowMap.get(item.y)!.push(item);
  }

  const result: GridLayoutItem[] = [];
  let currentY = 0;

  for (const [, rowItems] of [...rowMap.entries()].sort(([a], [b]) => a - b)) {
    const rowMaxH = Math.max(...rowItems.map((item) => item.h));
    let x = 0;

    for (const item of rowItems) {
      const scaledW = Math.round((item.w * toCols) / fromCols);
      const newMinW = item.minW
        ? Math.max(1, Math.min(toCols, Math.round((item.minW * toCols) / fromCols)))
        : undefined;
      const newW = Math.max(newMinW ?? 1, Math.min(scaledW, toCols));

      if (x + newW > toCols) {
        currentY += rowMaxH;
        x = 0;
      }

      result.push({
        ...item,
        x,
        y: currentY,
        w: newW,
        ...(newMinW !== undefined && { minW: newMinW }),
      });

      x += newW;
    }

    currentY += rowMaxH;
  }

  return { ...layouts, lg: result };
}
