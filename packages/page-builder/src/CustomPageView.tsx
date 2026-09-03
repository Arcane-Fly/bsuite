/*
 * CustomPageView — the ONE presentation contract for a custom page.
 *
 * WHY THIS EXISTS (ADR-0011, superseding ADR-0003)
 * ---------------------------------------------------------------------------
 * ADR-0003 gave every consumer app its own `CustomPageRenderer` and no shared
 * package. Measured across all six app trees on 2026-09-03, that produced FOUR
 * implementations of one capability:
 *
 *   crm7                    211 lines  real interactive content
 *   conduit                 310 lines  the shared grid, and "Widget placeholder"
 *   braden                  129 lines  JSON.stringify(layout) in a <pre>
 *   business-suite-unified  138 lines  JSON.stringify(layout) in a <pre>
 *
 * Two of the four print raw JSON at users, on live routed screens.
 *
 * WHAT IS SHARED AND WHAT IS NOT — the seam matters
 * ---------------------------------------------------------------------------
 * The apps' FETCHING is fine. All four reach `custom_pages` correctly with their
 * own Supabase client and their own cache. It is the RENDERING that diverged. So
 * this component deliberately does NOT fetch: it takes the already-fetched page
 * and owns only the presentation contract.
 *
 * That choice keeps this package free of a Supabase and a TanStack Query peer
 * dependency, which a layout package has no business carrying, and it leaves each
 * app's existing data path untouched.
 *
 * ADR-0003's ONE DURABLE POINT IS PRESERVED. It argued that "each consumer app
 * has different widget catalogues, different routing conventions, different
 * styling primitives". True, and it survives here as the `renderLayout` prop —
 * an extension point rather than a reason to pay for the whole component four
 * times.
 *
 * THE DEFAULT IS THE POINT
 * ---------------------------------------------------------------------------
 * An app with no widget catalogue yet gets `renderStructuredLayout`, which walks
 * the stored sections and fields and renders them as headings and labelled rows.
 * It is not interactive and does not pretend to be. It is, however, READABLE —
 * which raw JSON is not. The two apps that shipped `<pre>{JSON.stringify(...)}`
 * did so because there was nothing else to reach for; now there is.
 */
import type { ReactNode } from 'react';

/** The subset of a `custom_pages` row this component needs. Apps may pass more. */
export interface CustomPageLike {
  title: string;
  description?: string | null;
  layout?: unknown;
}

/**
 * A stored layout. Deliberately structural and permissive: this package does not
 * own the field vocabulary, and a layout carrying keys it does not recognise must
 * render what it can rather than throw.
 */
export interface StoredLayoutSection {
  id?: string;
  title?: string;
  description?: string | null;
  columns?: number;
  fields?: Array<{ fieldKey?: string; label?: string; [k: string]: unknown }>;
}

export interface StoredLayout {
  sections?: StoredLayoutSection[];
  tabs?: Array<{ id?: string; title?: string; sections?: StoredLayoutSection[] }>;
}

export interface CustomPageViewProps {
  /** The already-fetched row. `null` means resolved-and-absent; `undefined` means not yet known. */
  page: CustomPageLike | null | undefined;
  isLoading?: boolean;
  error?: { message: string } | null;
  /**
   * What to do when the page resolves to nothing.
   *
   * `silent` (the default) is for an EMBEDDED mount that sits beside a static
   * layout: a miss must render nothing rather than an error card in the middle of
   * a working page.
   *
   * `message` is for a route where the custom page IS the whole page. Silence
   * there is a blank screen, which reads as broken.
   */
  onMissing?: 'silent' | 'message';
  /** The per-app widget catalogue. Omit it and the structural default is used. */
  renderLayout?: (layout: StoredLayout, page: CustomPageLike) => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (message: string) => ReactNode;
  renderEmpty?: () => ReactNode;
  className?: string;
}

/** A layout with no sections and no tabs has nothing to draw. */
export function layoutIsEmpty(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return true;
  const l = layout as StoredLayout;
  const sections = Array.isArray(l.sections) ? l.sections : [];
  const tabs = Array.isArray(l.tabs) ? l.tabs : [];
  if (tabs.length > 0) return false;
  return sections.length === 0;
}

/** Every section in a layout, whether it sits at the top level or inside a tab. */
export function flattenSections(layout: StoredLayout): StoredLayoutSection[] {
  const out: StoredLayoutSection[] = Array.isArray(layout.sections) ? [...layout.sections] : [];
  for (const tab of Array.isArray(layout.tabs) ? layout.tabs : []) {
    for (const s of Array.isArray(tab.sections) ? tab.sections : []) out.push(s);
  }
  return out;
}

/** Turn `given_name` into `Given name` when a field carries no explicit label. */
function humanise(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim();
  if (spaced.length === 0) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The readable default. NOT a widget catalogue and not pretending to be one — it
 * renders the SHAPE a page was given, so an app without its own catalogue shows
 * something a person can read instead of `JSON.stringify`.
 */
export function renderStructuredLayout(layout: StoredLayout): ReactNode {
  const sections = flattenSections(layout);
  return (
    <div className="space-y-6">
      {sections.map((section, si) => {
        const fields = Array.isArray(section.fields) ? section.fields : [];
        return (
          <section key={section.id ?? `section-${si}`} className="space-y-2">
            {section.title ? (
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {section.title}
              </h2>
            ) : null}
            {section.description ? (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            ) : null}
            {fields.length > 0 ? (
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {fields.map((field, fi) => {
                  const key = typeof field.fieldKey === 'string' ? field.fieldKey : `field-${fi}`;
                  const label =
                    typeof field.label === 'string' && field.label.length > 0
                      ? field.label
                      : humanise(key);
                  return (
                    <div key={key} className="min-w-0">
                      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
                      <dd className="truncate text-sm text-foreground">&mdash;</dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No fields in this section.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function CustomPageView({
  page,
  isLoading = false,
  error = null,
  onMissing = 'silent',
  renderLayout,
  renderLoading,
  renderError,
  renderEmpty,
  className,
}: CustomPageViewProps) {
  if (isLoading) {
    if (renderLoading) return <>{renderLoading()}</>;
    // Silence while loading is right for an embedded mount: a spinner in the
    // middle of a page that has already drawn reads as the page being broken.
    return onMissing === 'message' ? (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading&hellip;
      </div>
    ) : null;
  }

  if (error) {
    if (onMissing !== 'message') return null;
    if (renderError) return <>{renderError(error.message)}</>;
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-destructive/40 p-4">
        <p className="text-sm font-medium text-destructive">This page could not be loaded.</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!page) {
    if (onMissing !== 'message') return null;
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">Page not found</p>
      </div>
    );
  }

  const layout = (page.layout ?? {}) as StoredLayout;
  const empty = layoutIsEmpty(layout);

  return (
    <section className={className ?? 'space-y-4'}>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
        {page.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
        ) : null}
      </header>

      {empty
        ? renderEmpty
          ? renderEmpty()
          : (
              <div className="rounded-lg border-2 border-dashed py-12 text-center text-muted-foreground">
                <p className="text-sm">This page has no layout configured yet.</p>
              </div>
            )
        : renderLayout
          ? renderLayout(layout, page)
          : renderStructuredLayout(layout)}
    </section>
  );
}
