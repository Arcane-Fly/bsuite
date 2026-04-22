# TGA API Integration Reference

**Status:** W (Working draft — requires review before Phase 3 implementation begins)
**Author:** BSuite platform team
**Date:** 2026-04-22
**Relates to:** [docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md §R.3 / §7.2 / §9 item 11](plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md)

---

## 1. Purpose

Phase 3 of the entity-linkage plan introduces a canonical `units_of_competency` table plus `qualification_units` join, and it promotes the existing `training_providers` / `qualifications` references to first-class FKs. The seeding and ongoing refresh of that reference data is consumed from [training.gov.au](https://training.gov.au/) — the Commonwealth National Training Register (NTR).

BSuite uses the NTR SOAP web services to:

1. **Seed** `qualifications`, `units_of_competency`, `qualification_units`, and `training_providers` (RTO scope rows) on first deploy of Phase 3.
2. **Sync daily** via a `tga-sync` Supabase edge function using `SearchByModifiedDate` so downstream CRM7 / R80.3 references reflect supersession, new releases, and scope changes within 24 h.
3. **Offer CSV fallback** for environments without NTR credentials (local dev, air-gapped demos).

Reference data is tenant-agnostic — all tenants share a single canonical copy; write access is limited to the edge function service role and `platform_admin`.

## 2. API overview

The NTR publishes three SOAP 1.1 / 1.2 services over HTTPS. Base URLs are confirmed by fetching the live WSDLs ([TrainingComponentService WSDL](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/TrainingComponentService.svc?wsdl), [OrganisationService WSDL](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/OrganisationService.svc?wsdl), [ClassificationService WSDL](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/ClassificationService.svc?wsdl)):

| Environment | Base URL |
|---|---|
| **Sandbox** | `https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/` |
| **Production** | `https://ws.training.gov.au/Deewr.Tga.Webservices/` [NEEDS VERIFICATION: confirm at onboarding — legacy docs reference `https://ws.training.gov.au/` but the production host has historically required separate provisioning] |

### 2.1 Service catalogue (what BSuite uses vs. out-of-scope)

| Service | `.svc` endpoint | BSuite usage | Phase 3 scope |
|---|---|---|---|
| **TrainingComponentService** | `TrainingComponentService.svc` | Read qualifications, units of competency, training packages, skill sets, releases, mappings | **IN** |
| **OrganisationService** | `OrganisationService.svc` | Read RTO organisations + scope of registration | **IN** |
| **ClassificationService** | `ClassificationService.svc` | Classification schemes / purposes (industry sector taxonomy) | Out of scope for Phase 3 (may revisit when we add industry classification filters) |

### 2.2 Relevant operations (verbatim from WSDL)

`TrainingComponentService` (read-side ops BSuite calls):

- `Search` — filter by code/title, training component type, classification
- `SearchByModifiedDate` — incremental sync (primary daily-sync op)
- `SearchDeletedByDeletedDate` — pick up physical deletions
- `GetDetails` — full payload for a single `Code`
- `GetLookup` — enum lookup values (e.g. `TrainingComponentEndReason`)
- `GetServerTime` — drift check

Mutation ops (`Add`/`Update`/`Delete`/`TransferDataManager`) exist on both services but are not invoked — BSuite credentials are read-only.

`OrganisationService` (read-side ops BSuite calls): `Search`, `SearchByScope`, `SearchByModifiedDate`, `SearchDeletedByDeletedDate`, `GetDetails`, `GetLookup`, `GetServerTime`.

### 2.3 Rate limits + fair use

No formal rate-limit table is published; throttling is "reasonable fair use" [NEEDS VERIFICATION]. v12 release notes (2021-12-01) recommend `PageSize≤100` and no concurrent pagination. BSuite enforces:

- `PageSize = 100` on every paged request
- Sequential pagination (no parallelisation within a run)
- 250 ms inter-call delay on full-catalogue seed
- Exponential backoff on 5xx / WCF faults (3 retries: 1 s → 5 s → 30 s)

### 2.4 REST / NTR Web API status

The [`training.gov.au/swagger`](https://training.gov.au/swagger) landing page (titled "NTR Web API") exists but `/swagger/v1/swagger.json` returned 404 unauthenticated on 2026-04-22 [verified by curl]. SOAP remains canonical for Phase 3; REST migration is a future follow-up, not a blocker.

## 3. Auth flow

**Authentication: HTTP Basic over TLS.** The WSDL security policy is `TransportBinding` + `sp:HttpsToken` + `sp:UsernameToken` (`SignedSupportingToken`), but the sandbox accepts plain `Authorization: Basic …` over HTTPS. WS-Security `UsernameToken` via `node-soap`'s `WSSecurity` is the portable fallback.

### 3.1 Credentials

- **Sandbox read-only:** `Username: WebService.Read` / `Password: Asdf098` (case-sensitive) — publicly documented at [data.gov.au](https://data.gov.au/data/dataset/training-gov-au-web-service-access-to-sandbox-environment). Safe to commit as fallback for CI. Do not rely on them being stable forever.
- **Sandbox write-enabled / production:** register at the TGA download area portal `https://tga.hsd.com.au` (per [tga support FAQ](https://training.gov.au/home/Enquiry)); provisioning is manual via the `tgasupport@dese.gov.au` support inbox [NEEDS VERIFICATION: confirm current inbox at onboarding — the Department email has been renamed twice].

### 3.2 Supabase Vault storage

Edge function reads credentials from Supabase Vault via environment-bound secrets, **never** hard-coded:

```sql
-- one-off, managed via supabase CLI:
select vault.create_secret('<tga-password>', 'tga_api_password', 'NTR SOAP read credential, rotated YYYY-MM-DD');
```

Edge function env binds `TGA_API_USER` + `TGA_API_PASSWORD` to the Vault references. No plaintext credential may appear in source, Git history, or `dist/`.

### 3.3 Rotation policy

- Sandbox read-only credential: no rotation (public).
- Production / write-enabled: **90-day rotation** per plan §R.3. Calendar invite created on first credential receipt. Rotation playbook: (1) request new credential from TGA support; (2) update Vault secret; (3) redeploy edge function; (4) verify next scheduled run; (5) revoke old credential after a 24 h overlap.

## 4. Field mappings

Elements confirmed by inspection of the live XSDs (`TrainingComponentService.svc?xsd=xsd1`, `OrganisationService.svc?xsd=xsd1`). The table covers only fields Phase 3 needs — TGA's XSDs expose richer detail which BSuite deliberately drops.

### 4.1 Qualification → `qualifications`

| TGA SOAP field | BSuite TS | Supabase column | Notes |
|---|---|---|---|
| `TrainingComponent.Code` | `Qualification.code` | `qualifications.code` | PK candidate; NTR-global |
| `TrainingComponent.Title` | `Qualification.title` | `qualifications.title` | |
| `TrainingComponent.ComponentType` (`Qualification`) | — | filter predicate | discriminator |
| `TrainingComponent.ParentCode` | `Qualification.training_package_code` | `qualifications.training_package_code` | FK to `training_packages.code` |
| `TrainingComponent.ParentTitle` | — | `qualifications.training_package_title` (denorm) | speed display |
| `UsageRecommendations[].State` | `Qualification.usage_recommendations` | `qualifications.usage_recommendations` jsonb | per-state `"Recommended"/"Current"/…` strings |
| `TrainingComponent.CreatedDate` | `Qualification.created_at_source` | `qualifications.source_created_at` | |
| `TrainingComponent.UpdatedDate` | `Qualification.updated_at_source` | `qualifications.source_updated_at` | drives incremental sync cursor |
| `TrainingComponent.Releases[]` | `Qualification.releases` | `qualifications.releases` jsonb | array of `{ReleaseNumber, ReleaseDate, Currency, UnitGrid, Files}` |
| `TrainingComponent.IsConfidential` | — | skip | out-of-scope metadata |
| `TrainingComponent.MappingInformation` + `Release.Components[]` + `Mapping` | `Qualification.mappings` | `qualifications.mappings` jsonb | holds `IsEquivalent`, `MapsToCode` — drives supersession logic |

**Status derivation:** TGA does not expose a single `Status` field on `TrainingComponent`; status is derived from the **most recent** `Release.Currency` value. Map:

| `Release.Currency` | BSuite status |
|---|---|
| `Current` | `current` |
| `Superseded` | `superseded` |
| `Deleted` | `deleted` |
| anything else (e.g. `TransitionExpired`) | `non_current` |

The WSDL `LookupName='TrainingComponentReleaseCurrency'` returns the canonical value list; we call `GetLookup` once on first seed to validate the mapping. `TrainingComponentSummary.IsCurrent` is a boolean shortcut used by `Search`; `SearchDeletedByDeletedDate` is the authoritative source for `deleted`.

### 4.2 Unit of Competency → `units_of_competency` (new Phase 3 table)

Same `TrainingComponent` shape as §4.1, filtered by `ComponentType='Unit'`:

| TGA SOAP | BSuite column |
|---|---|
| `Code` | `units_of_competency.code` (PK) |
| `Title` | `units_of_competency.title` |
| `ParentCode` | `units_of_competency.training_package_code` |
| Most recent `Release.Currency` | `units_of_competency.status` (`'current' \| 'superseded' \| 'deleted' \| 'non_current'`) |
| `Releases[]` | `units_of_competency.releases` jsonb |

**Elements + performance criteria:** `GetDetails` returns elements embedded in `Release.Files` (companion volume ZIPs — XML, not direct fields). Phase 3 **does not parse** companion volumes; `units_of_competency.elements` stays nullable for future enrichment. [NEEDS VERIFICATION: whether TGA has added a direct element endpoint in v12 — WSDL inspection suggests no.]

### 4.3 Qualification → Unit join → `qualification_units`

Source: `TrainingComponent` where `ComponentType='Qualification'` → most recent `Release.UnitGrid[]` (array of `UnitGridEntry { Code, Title }`).

**Lossy mapping:** `IsCore` / core-vs-elective is **not** directly on `UnitGridEntry` in the v12 XSD — the companion-volume ZIP carries the core/elective classification in an XML file named like `Packaging_Rules.xml`. Phase 3 proposes:

- `qualification_units.core_or_elective` column, defaulting to `NULL` for SOAP-seeded rows
- CSV import + companion-volume parser defer to Phase 3.a (opt-in enrichment)

### 4.4 Training Package → `training_packages`

| TGA | BSuite |
|---|---|
| `TrainingComponent` with `ComponentType='TrainingPackage'` `.Code` / `.Title` | `training_packages.code` / `.title` |
| `Releases[0].ReleaseDate` | `training_packages.current_release_date` |

### 4.5 RTO scope → `training_providers.rto_scope_*`

Source: `OrganisationService.SearchByScope` + `GetDetails`.

| TGA SOAP | BSuite column |
|---|---|
| `Organisation.Codes[].Value` (type `NRT`) | `training_providers.rto_code` (e.g. `"90045"`) |
| `Organisation.LegalPersonName` | `training_providers.legal_name` |
| `Organisation.TradingNames[]` | `training_providers.trading_names` text[] |
| `Scope[].NrtCode` where `TrainingComponentType='Qualification'` | `training_providers.rto_scope_qualification_codes` text[] |
| `Scope[].NrtCode` where `TrainingComponentType='Unit'` | `training_providers.rto_scope_unit_codes` text[] |
| `Scope[].ExtentCode` | stored alongside each code in `rto_scope_details` jsonb |
| `RegistrationPeriod.EndReasonCode` | `training_providers.registration_end_reason` |
| `HasActiveRegistration` (search result) | `training_providers.is_registered` bool |
| `DeliveryNotification[]` | ignored Phase 3 (VET FEE-HELP noise) |

## 5. Sync strategy

### 5.1 Cadence

- **Daily** 03:15 AEST (low-traffic window) via `pg_cron` calling `net.http_post` to invoke the edge function with a shared-secret header.
- Full rebuild option triggered manually via a BSU admin button calling the same function with `{ "mode": "reseed" }`.

### 5.2 Incremental delta

1. Read cursor from `tga_sync_runs.latest_success_modified_at` (defaults to `'1970-01-01'` on first run).
2. Call `TrainingComponentService.SearchByModifiedDate(from=<cursor>, componentTypes=QualsSkillsUnits, page=N, pageSize=100)` until `Results[].Count < PageSize`.
3. For each `Code`, call `GetDetails` (batched to minimise round-trips — NTR supports `Codes[]` array in `GetDetails`).
4. Upsert into `qualifications` / `units_of_competency` inside a single transaction per page.
5. Repeat for `OrganisationService.SearchByModifiedDate`.
6. On full-run success, advance cursor to the run's start time (guaranteed monotonic — TGA `UpdatedDate` is server-side).

### 5.3 Tombstones

`SearchDeletedByDeletedDate` is called after each main sweep; rows returned are soft-marked `status='deleted'` — **never hard-deleted** (downstream placements may still reference the code historically).

### 5.4 Audit table

```
tga_sync_runs (
  id uuid pk,
  started_at timestamptz,
  finished_at timestamptz,
  status text check (status in ('success','partial','failed','running')),
  last_modified_cursor timestamptz,
  inserted int, updated int, failed int,
  error_summary text
)
```

`tenant_settings.tga_last_sync_at` is denormalised for the admin UI (read-only for non-`platform_admin`).

### 5.5 Error recovery

| Condition | Behaviour |
|---|---|
| Timeout / 5xx | 3 retries, exponential backoff (1 s / 5 s / 30 s) |
| WCF `Fault` with `FaultCode='Client'` | log + skip page, continue |
| Transport failure mid-run | mark run `status='partial'`, cursor **not** advanced → next run resumes from same `last_modified_cursor` |
| Credential rejection | mark `status='failed'`, emit Supabase log + webhook alert to #bsuite-ops |

### 5.6 CSV fallback

Admins can upload a CSV at `/admin/reference-data/qualifications/import` (BSU). Required columns (in order, UTF-8, comma-separated, header row required):

```
code,title,training_package_code,status,usage_recommendations_json
```

- `status` must be one of `current|superseded|deleted|non_current`.
- `usage_recommendations_json` is a JSON array of `{state, recommendation}` or empty.
- All string fields run through `DOMPurify` server-side before insert.
- Row failures collected into a downloadable error report; the import is transactional per batch of 500.

Same format exists for `units_of_competency.csv` and `qualification_units.csv`.

## 6. Edge function shape (Deno TS pseudocode)

```ts
// supabase/functions/tga-sync/index.ts
import { parseStringPromise, Builder } from 'npm:xml2js@0.6.2';

const TGA_BASE = Deno.env.get('TGA_API_BASE')!;        // https://ws.sandbox.training.gov.au/...
const USER     = Deno.env.get('TGA_API_USER')!;         // vault-bound
const PASS     = Deno.env.get('TGA_API_PASSWORD')!;     // vault-bound — NEVER log

async function soapCall(svc: 'TrainingComponentService'|'OrganisationService', op: string, body: object) {
  const envelope = buildEnvelope(op, body);             // uses xml2js Builder
  const res = await fetch(`${TGA_BASE}/${svc}.svc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction':   `http://training.gov.au/ITrainingComponentService/${op}`,
      'Authorization': 'Basic ' + btoa(`${USER}:${PASS}`),
    },
    body: envelope,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new SoapError(res.status, await res.text());
  return parseStringPromise(await res.text(), { explicitArray: false });
}

Deno.serve(async (req) => {
  const started = new Date();
  const cursor  = await loadCursor();                   // from tga_sync_runs
  let inserted = 0, updated = 0, failed = 0;
  try {
    for await (const page of paged(svc => soapCall('TrainingComponentService','SearchByModifiedDate',
        { from: cursor, componentTypes: 'QualsSkillsUnits', pageSize: 100 }))) {
      const detailed = await soapCall('TrainingComponentService','GetDetails',
        { codes: page.results.map(r => r.Code) });
      const rows = detailed.map(mapToBsuiteRow);        // §4 mapping
      const { upsertedInsert, upsertedUpdate } = await supabase
        .from('qualifications').upsert(rows, { onConflict: 'code' });
      inserted += upsertedInsert; updated += upsertedUpdate;
    }
    // repeat for OrganisationService…
    await recordRun({ started, status: 'success', cursor: started.toISOString(),
                      inserted, updated, failed });
    console.info(`tga-sync ok: +${inserted} ~${updated} !${failed}`);
    return Response.json({ inserted, updated, failed,
                           duration_ms: Date.now() - started.getTime() });
  } catch (err) {
    await recordRun({ started, status: 'failed', error_summary: err.message });
    console.error('tga-sync failed', err);              // err.message is pre-sanitised, never contains creds
    return new Response('tga-sync failed', { status: 500 });
  }
});
```

**Library choice:** minimal raw `fetch` + `xml2js` (NPM via Deno) rather than the full `node-soap` client. Rationale: (1) `node-soap` bundles ~1.5 MB of dependencies that Deno Deploy rejects on cold-start budget; (2) the three endpoints we touch are narrow; (3) we do not need WSDL-driven client proxying. `node-soap`'s [`WSSecurity`](https://github.com/vpulim/node-soap#wssecurity) pattern (retrieved via Context7 `/vpulim/node-soap`) is documented here for the fallback path if NTR ever requires `PasswordDigest` instead of Basic-over-HTTPS.

## 7. Security

### 7.1 Credential hygiene

- Never log `TGA_API_PASSWORD` or any `Authorization` header. Enforced by a `console.log`-safe wrapper in the edge function.
- Post-deploy check: `grep -R "Asdf098\|WebService.Read\|<actual-prod-password>" dist/ supabase/functions/tga-sync/` must return empty before merge. Added to `ship-all-apps` pre-flight.
- Edge function deploys use `--no-verify-jwt false` (JWT required for manual invocation) but `pg_cron` invocation uses a separate `TGA_SYNC_TRIGGER_SECRET` header checked in-function.

### 7.2 RLS on reference tables

Tenant-agnostic READ for any authenticated user (reference data, no PII):

```sql
alter table qualifications enable row level security;
create policy "qualifications readable by authenticated"
  on qualifications for select to authenticated using (true);
-- same for units_of_competency, qualification_units, training_packages
```

WRITE restricted to service role (edge function) + `platform_admin`:

```sql
create policy "qualifications writable by platform_admin"
  on qualifications for all to authenticated
  using  (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));
```

`training_providers` already has tenant-scoped RLS; the TGA-sourced scope columns are writable only by the edge function's service role.

### 7.3 Admin CSV upload

- Restricted to `admin` role on the tenant (BSU admin UI).
- Every string column runs through `DOMPurify.sanitize(value, { ALLOWED_TAGS: [] })` before insert.
- File size cap 5 MB; row cap 50 000 per upload; rate-limited to 1 upload per tenant per 5 min.

## 8. Testing strategy for Phase 3

### 8.1 Unit tests

- Fixture-driven: commit `__fixtures__/tga/qualification-BSB30120.xml` + `unit-BSBCMM211.xml` + `org-90045.xml` (sanitised real responses).
- Assertions: `mapToBsuiteRow(fixture).code === 'BSB30120'`, status derivation, jsonb shape.
- Coverage target: 90 % of mapping + status-derivation code paths.

### 8.2 Integration tests

- Deno `--allow-net` test calling sandbox `GetServerTime` to confirm basic connectivity + credential wiring.
- Skipped when `TGA_API_PASSWORD` env var is absent (keeps CI runs on forked PRs green).
- Single `Search(code='BSB30120')` round-trip on every deploy as a smoke test.

### 8.3 Playwright

- Admin UI flow: login as `platform_admin` → trigger manual sync → assert `tga_sync_runs` row transitions `running→success` within 120 s → assert `qualifications` count increased.
- Skipped when `SKIP_TGA_E2E=true` or sandbox credentials absent.

## 9. References

**Source docs:**
- [training.gov.au — Connecting your system to training.gov.au APIs](https://training.gov.au/support/connecting-your-system-traininggovau-apis-1)
- [training.gov.au — Upcoming changes to SOAP XML files](https://training.gov.au/support/upcoming-changes-xml-files-accessed-soap-web-services)
- [ws.sandbox.training.gov.au/webservices.html](https://ws.sandbox.training.gov.au/webservices.html) — v12 SDK release notes (2021-12-01)
- [data.gov.au — Web service access to sandbox environment](https://data.gov.au/data/dataset/training-gov-au-web-service-access-to-sandbox-environment) (public sandbox credentials)
- Sandbox WSDLs (HTTP 200, 2026-04-22): [TrainingComponentService](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/TrainingComponentService.svc?wsdl), [OrganisationService](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/OrganisationService.svc?wsdl), [ClassificationService](https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/ClassificationService.svc?wsdl)
- [NTR Web API swagger landing](https://training.gov.au/swagger) (future REST, spec not yet public)

**Library docs (Context7-verified):** `node-soap` (`/vpulim/node-soap`) — `WSSecurity` UsernameToken pattern, documented as fallback path; `xml2js` — primary envelope parser/builder in edge function.

**Plan references:** [plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md](plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md) §R.3 (prereq gate), §7.2 (GTO decisions), §9 item 11 (exit criterion).

---

## Appendix A — Open questions for Braden

1. **Production base URL** — confirm `https://ws.training.gov.au/Deewr.Tga.Webservices/` is still the v12 production host post-onboarding.
2. **Rate-limit number** — obtain the fair-use cap in writing from TGA support.
3. **Core-vs-elective enrichment** — ship Phase 3 with `qualification_units.core_or_elective = NULL` and defer companion-volume parsing, or block Phase 3?
4. **Support inbox** — `tgasupport@dese.gov.au` vs current DEWR address.
5. **REST migration timing** — parallelise with SOAP if NTR Web API ships in FY26, or wait for stability?
