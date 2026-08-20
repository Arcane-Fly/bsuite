import { Command } from 'cmdk';
import {
  Database,
  Download,
  Link,
  Navigation,
  PlusCircle,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TenantEntity } from '../types.js';

export interface CommandPaletteNavTarget {
  path: string;
  label: string;
  description?: string;
}

export interface CommandPaletteProps {
  entities: TenantEntity[];
  navigationTargets: CommandPaletteNavTarget[];
  /** Called when a navigation target is chosen. */
  onNavigate?: (path: string) => void;
  /** Called when an entity is chosen (consumer typically pans/zooms to it). */
  onSelectEntity?: (entity: TenantEntity) => void;
  /** Called when the user picks "Tidy Up Layout" (§3.6 item 3 + §3.10). */
  onTidyUp?: () => void;
  /** Called when the user picks "Export as PNG" (§3.6 item 8 + §3.10). */
  onExportPng?: () => void;
  /**
   * Called when the user picks "Add Field to Selected Entity" (§3.10). If
   * omitted, the command falls back to dispatching the `bsuite-add-field`
   * CustomEvent which SchemaCanvas handles by default.
   */
  onAddField?: () => void;
}

/**
 * Mounted once at the app shell level. Listens for Cmd/Ctrl+K globally.
 * Phase 1a command catalogue: `Find Entity <name>` + `Go to <page-path>`.
 * Phase 1b adds `Tidy Up Layout` per §3.10. Everything else ships in Phases
 * 3 / 5.
 */
export function CommandPalette({
  entities,
  navigationTargets,
  onNavigate,
  onSelectEntity,
  onTidyUp,
  onExportPng,
  onAddField,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  // Focus-return: Cmd/Ctrl+K has no persistent trigger element (it's a
  // shortcut, not a button), so the closest equivalent to "return focus to
  // the trigger" is returning it to whatever had focus the instant before
  // the palette opened.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Stable via useCallback (setOpen and the ref are both stable) so it can
  // sit in the effect's dependency array below without re-binding the
  // window listener on every render.
  const close = useCallback(() => {
    setOpen(false);
    previouslyFocused.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) {
            previouslyFocused.current = document.activeElement as HTMLElement | null;
          }
          return next;
        });
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-overlay/50 p-4 pt-[10vh]"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Command Palette"
          className="w-full"
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Link className="h-4 w-4 text-muted-foreground" />
            <Command.Input
              placeholder="Find an entity or type a page path..."
              className="h-11 flex-1 bg-transparent text-sm placeholder:text-text-subtle focus:outline-none"
            />
            <kbd className="hidden items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              Esc
            </kbd>
            <button
              type="button"
              onClick={close}
              aria-label="Close command palette"
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-muted-foreground">
              No matches.
            </Command.Empty>

            {/* Actions group is always rendered — "Add Field" has a
                CustomEvent fallback that SchemaCanvas listens for by default,
                so it works without an explicit `onAddField` wiring. Tidy Up
                and Export PNG remain opt-in (only render when their callback
                prop is provided). */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {onTidyUp ? (
                <Command.Item
                  value="Tidy Up Layout auto arrange dagre"
                  onSelect={() => {
                    onTidyUp();
                    close();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-role-primary/10 aria-selected:text-primary-text dark:aria-selected:bg-role-primary/10 dark:aria-selected:text-primary-text"
                >
                  <Wand2 className="h-4 w-4 shrink-0 text-primary-text" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">Tidy Up Layout</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      Auto-arrange entities left-to-right
                    </span>
                  </div>
                </Command.Item>
              ) : null}
              {onExportPng ? (
                <Command.Item
                  value="Export as PNG download image snapshot"
                  onSelect={() => {
                    onExportPng();
                    close();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-role-primary/10 aria-selected:text-primary-text dark:aria-selected:bg-role-primary/10 dark:aria-selected:text-primary-text"
                >
                  <Download className="h-4 w-4 shrink-0 text-success-text" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">Export as PNG</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      Download the schema as an image
                    </span>
                  </div>
                </Command.Item>
              ) : null}
              <Command.Item
                value="Add Field to Selected Entity new column"
                onSelect={() => {
                  if (onAddField) {
                    onAddField();
                  } else {
                    window.dispatchEvent(new CustomEvent('bsuite-add-field'));
                  }
                  close();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-role-primary/10 aria-selected:text-primary-text dark:aria-selected:bg-role-primary/10 dark:aria-selected:text-primary-text"
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-primary-text" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">Add Field to Selected Entity</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    Prompt for name + type and create a new column
                  </span>
                </div>
              </Command.Item>
            </Command.Group>

            {entities.length > 0 ? (
              <Command.Group
                heading="Find Entity"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {entities.map((entity) => (
                  <Command.Item
                    key={entity.id}
                    value={`${entity.label} ${entity.name}`}
                    onSelect={() => {
                      onSelectEntity?.(entity);
                      close();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-role-primary/10 aria-selected:text-primary-text dark:aria-selected:bg-role-primary/10 dark:aria-selected:text-primary-text"
                  >
                    <Database className="h-4 w-4 shrink-0 text-primary-text" />
                    <span className="truncate">{entity.label}</span>
                    <span className="ml-auto truncate font-mono text-[10px] text-muted-foreground">
                      {entity.name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {navigationTargets.length > 0 ? (
              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {navigationTargets.map((t) => (
                  <Command.Item
                    key={t.path}
                    value={`${t.label} ${t.path}`}
                    onSelect={() => {
                      onNavigate?.(t.path);
                      close();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-role-primary/10 aria-selected:text-primary-text dark:aria-selected:bg-role-primary/10 dark:aria-selected:text-primary-text"
                  >
                    <Navigation className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{t.label}</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        {t.path}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
