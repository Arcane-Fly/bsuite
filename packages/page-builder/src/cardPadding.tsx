'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CardPaddingContext = createContext<string | undefined>(undefined);

/**
 * A grid offers its inset to the first app Card. That Card places a boundary
 * around its children so inner panels keep their own spacing. A nested grid
 * supplies a new value, including undefined when its inset is not overridden.
 * No DOM wrapper or browser-specific CSS scoping is needed.
 */
export function CardPaddingBoundary({ padding, children }: { padding?: string; children: ReactNode }) {
  return <CardPaddingContext.Provider value={padding}>{children}</CardPaddingContext.Provider>;
}

export function useCardPadding(): string | undefined {
  return useContext(CardPaddingContext);
}
