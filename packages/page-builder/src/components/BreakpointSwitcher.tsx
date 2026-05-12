import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { type EditorBreakpoint, EDITOR_BREAKPOINTS } from '../utils/cascade.js';
import { cn } from '../utils.js';

export interface BreakpointSwitcherProps {
  value: EditorBreakpoint;
  onChange: (breakpoint: EditorBreakpoint) => void;
}

const BREAKPOINT_LABELS: Record<EditorBreakpoint, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

const BREAKPOINT_ICONS: Record<EditorBreakpoint, typeof Laptop> = {
  desktop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

export function BreakpointSwitcher({ value, onChange }: BreakpointSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Breakpoint switcher"
      className="inline-flex items-center rounded-md border border-border bg-muted p-1"
    >
      {EDITOR_BREAKPOINTS.map((breakpoint) => {
        const Icon = BREAKPOINT_ICONS[breakpoint];
        const isActive = breakpoint === value;
        return (
          <button
            key={breakpoint}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(breakpoint)}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            <span>{BREAKPOINT_LABELS[breakpoint]}</span>
          </button>
        );
      })}
    </div>
  );
}

