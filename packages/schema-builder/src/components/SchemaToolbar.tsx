/**
 * SchemaToolbar — floating toolbar rendered on top of the Schema Builder
 * canvas. Provides Tidy-Up / Fit-View buttons and a fuzzy entity search input.
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6
 * item 6 (minimap + zoom-to-fit + search).
 *
 * Positioned `absolute top-2 left-2 z-10` inside the canvas container so it
 * stays glued to the canvas on resize without introducing any new layout
 * primitive.
 */

import { Maximize2, Search, Wand2 } from 'lucide-react';
import type { ChangeEvent, ReactElement } from 'react';

export interface SchemaToolbarProps {
  onTidyUp: () => void;
  onFitView: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function SchemaToolbar({
  onTidyUp,
  onFitView,
  onSearchChange,
  searchQuery,
}: SchemaToolbarProps): ReactElement {
  return (
    <div
      className="absolute left-2 top-2 z-10 flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:gap-1 dark:border-neutral-700 dark:bg-neutral-900/95"
      role="toolbar"
      aria-label="Schema builder toolbar"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onTidyUp}
          title="Tidy up layout (auto-arrange)"
          aria-label="Tidy up layout"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Wand2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onFitView}
          title="Fit view"
          aria-label="Fit view"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div
        className="hidden h-5 w-px bg-neutral-200 sm:block dark:bg-neutral-700"
        aria-hidden="true"
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onSearchChange(e.target.value)
          }
          aria-label="Search entities"
          className="h-8 w-[180px] rounded-md border border-neutral-200 bg-white pl-7 pr-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>
    </div>
  );
}
