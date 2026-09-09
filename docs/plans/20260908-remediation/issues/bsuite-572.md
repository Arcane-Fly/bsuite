# feat(timesheet): geo-fence + kiosk + photo clock-in for AnyTime attendance parity — @bsuite/attendance package + clock-in.tsx (domain O)

https://github.com/GaryOcean428/bsuite/issues/572

Snapshot updatedAt: 2026-07-28T08:57:34Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · Codehouse parity audit**
> Source: /home/user/workspace/competitor/parity-matrix.md (row 120) + bsuite-inventory.md §5 item 4
> Plan: GaryOcean428/bsuite/docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md (TBD — being authored in parallel PR)

## Mandatory before merge

This issue requires the following skills loaded by the implementing agent:
- `supabase` + `supabase-postgres-best-practices` — `@bsuite/attendance` package migration; RLS on clock-in events table
- `forms-and-validation` (RHF + Zod) — kiosk clock-in form with geo-fence validation
- `tanstack-query` — real-time clock-in state polling
- `bsuite-brand-system` — kiosk UI must match BSuite D2C Neon Electric theme
- `qa-and-verification` — PWA + Geolocation API mock testing

## Red-team requirements (rulebook §6)

1. UX-DX agent — Kiosk mode must work on tablet viewport (min 768px); clock-in/out must be a large single-tap target; geo-fence error states must be clearly worded (not raw browser errors); WCAG 2.2 compliant
2. Security agent — Location data stored in `clock_in_events` must have RLS (tenant-scoped + employee-scoped read); photo URLs stored in Supabase Storage private bucket (authenticated URL only); biometric data never stored — camera used for liveness photo only
3. Performance agent — Geolocation API request timeout ≤ 5s; fallback to IP-based location if GPS unavailable; photo capture compressed to ≤ 200KB before upload
4. Reliability agent — Clock-in must work offline (IndexedDB queue) and sync when reconnected; failed geo-fence validation must show actionable error (not silent fail)
5. Quality agent — Conventional commits; new `@bsuite/attendance` package must export types compatible with crm7 `timesheet_events` table; no breaking changes to existing clock-in flows

## Codehouse evidence

- **AnyTime Admin Guide p.23–24**: Per-placement supervisor assignment and "USE DEFAULT SUPERVISOR ONLY" per client — consistent with kiosk deployment where a physical kiosk at a client site auto-assigns the default supervisor and locks timesheet entry to that placement.
- **AnyTime Admin Guide p.4**: "AnyTime can be accessed from any computer or mobile device with internet connection, including laptops, tablets and mobile phones."
- **OTS FAQ Article 7**: AnyTime requires Chrome or Edge — confirming browser-based kiosk (not native app).
- **bsuite-inventory.md §5 item 4**: "Geo-fence / photo / biometric time capture absent — Codehouse's AnyTime kiosk + geo-fence clock-in has no BSuite equivalent. No file in any of the 6 apps implements geo-location-gated timesheet entry."

> Note: Geo-fence and biometric clock-in are inferred from the kiosk deployment pattern; the PDFs describe the supervisor-lock and per-client deployment model. This is classified as a weak signal in the parity matrix but represents a competitive gap for site-based workforce management customers.

## Current BSuite state

- **Matrix row 120** (⛔ missing): "Zero implementation across all 6 BSuite apps" for geo-fence / kiosk / biometric attendance capture — `bsuite-inventory.md §O + §5 item 4`
- crm7 has a full PWA (`usePWA.ts`, `InstallPrompt.tsx`) and offline IndexedDB + SQLite WASM sync — the infrastructure foundation exists
- crm7 `timesheet_events` table already stores clock events — extend, don't replace

## Task list (parity gaps to close)

- [ ] Matrix row 120a: Create `@bsuite/attendance` shared package — exports `ClockInEvent` type, `useGeoFence(placementId)` hook (Geolocation API with configurable radius), `useKioskMode()` hook — target package: `packages/attendance` (new)
- [ ] Matrix row 120b: Ship `crm7/src/pages/timesheets/clock-in.tsx` — kiosk-optimised clock-in page; uses `@bsuite/attendance` hooks; shows "Clock In" / "Clock Out" CTA; captures lat/lng at click time; validates against geo-fence radius from placement settings — owning app: crm7 — target file: `src/pages/timesheets/clock-in.tsx` (new) — target package: crm7
- [ ] Matrix row 120c: Add geo-fence config to placement detail — `geo_fence_lat`, `geo_fence_lng`, `geo_fence_radius_m`, `use_default_supervisor_only` fields in `crm7/src/pages/placements/[id].tsx` + migration — owning app: crm7 — target file: `src/pages/placements/[id].tsx` — target package: crm7
- [ ] Matrix row 120d: Optional photo capture at clock-in — MediaDevices API camera capture; photo stored to Supabase Storage private bucket; photo URL linked to `clock_in_events` row; admin can view photos per pay period — owning app: crm7 — target file: `src/pages/timesheets/clock-in.tsx` — target package: crm7
- [ ] Matrix row 120e: Offline clock-in support — clock-in events queued in IndexedDB when offline; synced to `clock_in_events` table via `sync-service.ts` on reconnect — owning app: crm7 — target file: `src/lib/sync-service.ts` — target package: crm7

## Acceptance criteria

- [ ] `@bsuite/attendance` package published with `ClockInEvent` type, `useGeoFence()` hook, and `useKioskMode()` hook; unit tests cover geo-fence radius pass/fail cases
- [ ] `clock-in.tsx` page renders on tablet/mobile; Clock In button captures lat/lng; if placement has geo-fence config, validates distance before allowing submission; rejection shows clear error message
- [ ] Placement detail has geo-fence configuration fields; saving persists to `placement_geo_config` table (migration) with RLS
- [ ] Optional photo: camera capture produces ≤200KB JPEG; uploaded to private Supabase Storage bucket; URL stored in `clock_in_events.photo_url`; admin photo viewer accessible from `payroll/pay-periods/` page
- [ ] Offline queue: 3 clock-in events created offline sync correctly when reconnected; `clock_in_events` table row count matches queue

## Suggested team

Per Cron A routing matrix: HEAVY (new shared package + kiosk page + geo-fence infrastructure) — add to `bsuite_heavy_work_queue` + label `needs-team`.

## Citations

- [AnyTime Admin Guide (WF1_Pay_027) — Codehouse PDF](https://help.codehouseworkforce.com.au) p.23–24
- [MDN Web Docs — Geolocation API 2026](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Supabase Storage — private buckets 2026](https://supabase.com/docs/guides/storage/security/access-control)
- [PWA — Service Worker offline patterns 2026](https://web.dev/articles/service-worker-lifecycle)
- Internal: parity-matrix.md row 120
- Internal: bsuite-inventory.md §O (Mobile/Portal), §5 item 4

