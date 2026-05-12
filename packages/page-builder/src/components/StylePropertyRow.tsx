import { type ChangeEvent, useCallback, useMemo } from 'react';
import { useCurrentBreakpoint, usePageBuilderStore } from '../state/store.js';
import { resolveStyles, type StyleValue } from '../utils/cascade.js';
import { cn } from '../utils.js';

export interface StylePropertyRowProps {
  layoutId: string;
  property: string;
  label?: string;
}

function stringifyStyleValue(value: StyleValue | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function StylePropertyRow({ layoutId, property, label }: StylePropertyRowProps) {
  const currentBreakpoint = useCurrentBreakpoint();
  const layoutStyles = usePageBuilderStore((state) => state.layoutStyles[layoutId]);
  const updateStyleProperty = usePageBuilderStore((state) => state.updateStyleProperty);
  const resetStyleProperty = usePageBuilderStore((state) => state.resetStyleProperty);

  const resolved = useMemo(
    () => resolveStyles(layoutStyles, currentBreakpoint),
    [currentBreakpoint, layoutStyles],
  );

  const value = resolved.styles[property];
  const isOverridden = resolved.overriddenProperties.has(property);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateStyleProperty(layoutId, property, event.target.value, currentBreakpoint);
    },
    [currentBreakpoint, layoutId, property, updateStyleProperty],
  );
  const handleReset = useCallback(() => {
    resetStyleProperty(layoutId, property, currentBreakpoint);
  }, [currentBreakpoint, layoutId, property, resetStyleProperty]);

  return (
    <div className="grid grid-cols-[minmax(8rem,1fr)_minmax(0,2fr)_auto] items-center gap-2">
      <label className="text-xs text-muted-foreground" htmlFor={`${layoutId}-${property}`}>
        {label ?? property}
      </label>
      <input
        id={`${layoutId}-${property}`}
        value={stringifyStyleValue(value)}
        onChange={handleChange}
        className={cn(
          'h-8 rounded border border-border bg-background px-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isOverridden && 'text-primary',
        )}
      />
      {isOverridden ? (
        <button
          type="button"
          onClick={handleReset}
          className={cn(
            'inline-flex h-8 items-center rounded border border-border px-2 text-xs transition-colors',
            'text-primary hover:bg-primary/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          )}
        >
          Reset
        </button>
      ) : (
        <span className="h-8" />
      )}
    </div>
  );
}
