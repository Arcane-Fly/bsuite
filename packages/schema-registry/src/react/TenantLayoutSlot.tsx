'use client';
import { useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './types.js';

function isProductionRuntime(): boolean {
  const maybeProcess = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return maybeProcess?.env?.NODE_ENV === 'production';
}

// Module-scoped flag so the deprecation warning fires at most once per app session
// regardless of how many <TenantLayoutSlot> instances mount.
let deprecationWarned = false;

function warnDeprecatedOnce(): void {
  if (deprecationWarned) return;
  deprecationWarned = true;
  if (isProductionRuntime()) return;
  // eslint-disable-next-line no-console
  console.warn(
    '[@bsuite/schema-registry] TenantLayoutSlot is @deprecated as of 0.3.1 and will be removed in 0.4.0.\n' +
      'Replace with your app\'s CustomPageRenderer (ADR-0003).\n' +
      'Migration guide: docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md'
  );
}

interface TenantLayoutSlotProps {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supabase: SupabaseClient;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  route: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  appScope: AppScope;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context?: Record<string, unknown>;
}

/**
 * @deprecated Since `@bsuite/schema-registry@0.3.1`. Will be removed in `0.4.0`.
 *
 * `TenantLayoutSlot` is retained as a **no-op shim** so existing consumers
 * (braden `src/pages/Contact.tsx`, conduit `(dashboard)/{page,candidates,pipeline}.tsx`
 * + `LayoutSlotClient.tsx`, R80.3 `src/App.tsx`) continue to build while they
 * migrate to per-app `CustomPageRenderer` components per ADR-0003.
 *
 * The backing table `tenant_page_layouts` was dropped from production on
 * 2026-04-29 (ADR-0001). This shim does NOT query the dropped table — it
 * renders `null` unconditionally, emits a one-time `console.warn` in
 * development, and never throws. No PostgREST traffic, no Sentry noise.
 *
 * **Version history**:
 * - `0.2.x` — stable baseline. Rendered `tenant_page_layouts` rows.
 * - `0.3.0` — DEPRECATED on npm (premature atomic removal before consumers
 *   migrated; conduit had 5 active imports, braden 1, R80.3 1). Do not install.
 * - `0.3.1` — THIS VERSION. Restores the export as a no-op shim with a
 *   one-shot `console.warn` deprecation notice so existing consumers build
 *   cleanly while they migrate to per-app `CustomPageRenderer`.
 * - `0.4.0` — planned atomic removal once `git grep TenantLayoutSlot` across
 *   braden, conduit, R80.3, BSU, and CRM7 returns zero matches.
 *
 * **Migration path**:
 *   1. Implement `src/components/CustomPageRenderer.tsx` against `custom_pages`
 *      per `docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md` §Phase 2.
 *   2. Replace every `<TenantLayoutSlot … />` with `<CustomPageRenderer … />`.
 *   3. Bump `@bsuite/schema-registry` to `^0.4.0` once zero imports remain.
 *
 * @see docs/adr/ADR-0001-page-builder-ownership.md
 * @see docs/adr/ADR-0003-consumer-renderer-pattern.md
 */
export function TenantLayoutSlot(_props: TenantLayoutSlotProps): null {
  // useEffect ensures warn is outside the render phase (React purity rules).
  // Empty dep array: fire once per mount; module-level flag makes it once per
  // app session even across many mounts.
  useEffect(() => {
    warnDeprecatedOnce();
  }, []);
  return null;
}

export type { TenantLayoutSlotProps };
