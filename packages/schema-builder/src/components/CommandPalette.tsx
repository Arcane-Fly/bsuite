import { Command } from 'cmdk';
import {
  Database,
  Download,
  Link,
  Navigation,
  PlusCircle,
  Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Command Palette"
          className="w-full"
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-700">
            <Link className="h-4 w-4 text-neutral-400" />
            <Command.Input
              placeholder="Find an entity or type a page path..."
              className="h-11 flex-1 bg-transparent text-sm placeholder:text-neutral-400 focus:outline-none"
            />
            <kbd className="hidden items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 sm:inline-flex dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Esc
            </kbd>
          </div>
          <Command.List className="max-h-[50vh] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-neutral-500">
              No matches.
            </Command.Empty>

            {/* Actions group is always rendered — "Add Field" has a
                CustomEvent fallback that SchemaCanvas listens for by default,
                so it works without an explicit `onAddField` wiring. Tidy Up
                and Export PNG remain opt-in (only render when their callback
                prop is provided). */}
            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-neutral-500"
            >
              {onTidyUp ? (
                <Command.Item
                  value="Tidy Up Layout auto arrange dagre"
                  onSelect={() => {
                    onTidyUp();
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-100"
                >
                  <Wand2 className="h-4 w-4 shrink-0 text-purple-500" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">Tidy Up Layout</span>
                    <span className="truncate text-[10px] text-neutral-400">
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
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-100"
                >
                  <Download className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">Export as PNG</span>
                    <span className="truncate text-[10px] text-neutral-400">
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
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-100"
              >
                <PlusCircle className="h-4 w-4 shrink-0 text-blue-500" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">Add Field to Selected Entity</span>
                  <span className="truncate text-[10px] text-neutral-400">
                    Prompt for name + type and create a new column
                  </span>
                </div>
              </Command.Item>
            </Command.Group>

            {entities.length > 0 ? (
              <Command.Group
                heading="Find Entity"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-neutral-500"
              >
                {entities.map((entity) => (
                  <Command.Item
                    key={entity.id}
                    value={`${entity.label} ${entity.name}`}
                    onSelect={() => {
                      onSelectEntity?.(entity);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-100"
                  >
                    <Database className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="truncate">{entity.label}</span>
                    <span className="ml-auto truncate font-mono text-[10px] text-neutral-400">
                      {entity.name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {navigationTargets.length > 0 ? (
              <Command.Group
                heading="Go to"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-neutral-500"
              >
                {navigationTargets.map((t) => (
                  <Command.Item
                    key={t.path}
                    value={`${t.label} ${t.path}`}
                    onSelect={() => {
                      onNavigate?.(t.path);
                      setOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-blue-50 aria-selected:text-blue-900 dark:aria-selected:bg-blue-950 dark:aria-selected:text-blue-100"
                  >
                    <Navigation className="h-4 w-4 shrink-0 text-neutral-500" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{t.label}</span>
                      <span className="truncate font-mono text-[10px] text-neutral-400">
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
