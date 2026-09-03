/**
 * SchemaToolbar — floating toolbar rendered on top of the Schema Builder
 * canvas. Provides Tidy-Up / Fit-View / Export-PNG buttons and a fuzzy entity
 * search input.
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6
 * items 6 (minimap + zoom-to-fit + search) and 8 (PNG export).
 *
 * Positioned `absolute top-2 left-2 z-10` inside the canvas container so it
 * stays glued to the canvas on resize without introducing any new layout
 * primitive.
 */

import { Download, Maximize2, Search, Wand2 } from 'lucide-react';
import type { ChangeEvent, ReactElement } from 'react';

export interface SchemaToolbarProps {
  onTidyUp: () => void;
  onFitView: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  resultCount?: number;
  totalCount?: number;
  /** Phase 1b.2. Optional; button is hidden if omitted. */
  onExportPng?: () => void;
}

export function SchemaToolbar({
  onTidyUp,
  onFitView,
  onSearchChange,
  searchQuery,
  resultCount,
  totalCount,
  onExportPng,
}: SchemaToolbarProps): ReactElement {
  const hasResultCount =
    typeof resultCount === 'number' && typeof totalCount === 'number';

  return (
    <div
      className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-col gap-1.5 rounded-lg border border-border bg-card/95 p-2 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:gap-2"
      role="toolbar"
      aria-label="Schema builder toolbar"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onTidyUp}
          title="Tidy up layout (auto-arrange)"
          aria-label="Tidy up layout"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium text-text-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
        >
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">Tidy</span>
        </button>
        <button
          type="button"
          onClick={onFitView}
          title="Fit view"
          aria-label="Fit view"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium text-text-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Fit</span>
        </button>
        {onExportPng ? (
          <button
            type="button"
            onClick={onExportPng}
            title="Export as PNG"
            aria-label="Export schema as PNG"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium text-text-secondary hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring dark:hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PNG</span>
          </button>
        ) : null}
      </div>
      <div
        className="hidden h-5 w-px bg-muted sm:block"
        aria-hidden="true"
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search name, slug..."
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onSearchChange(e.target.value)
          }
          aria-label="Search entities"
          className="h-8 w-[180px] rounded-md border border-border-interactive bg-card pl-7 pr-2 text-xs text-foreground placeholder:text-text-subtle focus:border-role-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {hasResultCount ? (
          <div className="mt-1 text-[10px] text-muted-foreground" role="status">
            {searchQuery.trim()
              ? `${resultCount} of ${totalCount} entities matched`
              : `${totalCount} entities`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
