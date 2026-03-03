# TGA API Integration Audit — CRM7

**Date:** 2026-03-05
**Status:** Working (v1.00W)
**Author:** Windsurf Cascade
**Scope:** Training.gov.au (TGA) NTR REST API — full Swagger-documented surface, SOAP sandbox, field mapping

---

## Executive Summary

The existing `tga-search` Supabase Edge Function was targeting **dead API endpoints** from the pre-October 2024 training.gov.au site. The old undocumented REST endpoints (`/api/search`, `/api/qualification/{code}`) return 404.

The new training.gov.au (rebuilt as a Nuxt.js SPA) exposes a **fully documented OpenAPI 3.0.1 REST API** via Swagger UI at `https://training.gov.au/swagger/index.html` with **6 API specs** and **56 endpoints**. The API is **fully public** (no authentication required) and returns richer data than the old API.

Additionally, the **legacy SOAP sandbox endpoints are still alive** at `ws.sandbox.training.gov.au` with the published credentials.

The Edge Function and CRM7 client types have been rewritten to use the new REST endpoints.

---

## API Landscape (Four Layers)

### 1. Legacy SOAP Web Services (SANDBOX STILL ALIVE)

| Service | URL | Status |
|---------|-----|--------|
| **OrganisationService** | `https://ws.sandbox.training.gov.au/Deewr.Tga.WebServices/OrganisationService.svc` | ✅ HTTP 200 |
| **TrainingComponentService** | `https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/TrainingComponentService.svc` | ✅ HTTP 200 |
| **ClassificationService** | `https://ws.training.gov.au/Deewr.Tga.Webservices/ClassificationService.svc` | ⚠️ Production URL |

- **Sandbox credentials:** Username: `WebService.Read` (case sensitive), Password: `Asdf098` (case sensitive)
- **Production credentials:** Must be requested from TGA support
- **Note:** SOAP sandbox is functional but the new REST API is preferred for all new development

### 2. New NTR REST API — 6 Swagger Specs, 56 Endpoints

**Base URL:** `https://training.gov.au/api`
**Swagger UI:** `https://training.gov.au/swagger/index.html`
**Auth:** None required (fully public)
**API Version:** `?api-version=1.0` (optional query parameter)
**NTR Version:** `4.224.3.45` (from `/api/metadata`)

#### 2a. SEARCH V1 — 8 endpoints

| Endpoint | Method | Purpose | Verified |
|----------|--------|---------|----------|
| `/api/search/training` | GET | Full paginated training component search (qualifications, units, skill sets) | ✅ |
| `/api/search/training/preview` | GET | Quick autocomplete (5 results, lightweight) | ✅ |
| `/api/search/training/facets` | GET | Faceted counts (type, qual level, status, recognition manager) | ✅ |
| `/api/search/training/suggestions` | GET | Fuzzy search suggestions | ✅ |
| `/api/search/organisation` | GET | Full paginated organisation/RTO search | ✅ |
| `/api/search/organisation/preview` | GET | Quick RTO autocomplete | ✅ |
| `/api/search/organisation/facets` | GET | RTO faceted counts | ✅ |
| `/api/search/organisation/suggestions` | GET | RTO fuzzy suggestions | ✅ |

**Search query parameters (training):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchText` | string | Full-text search query |
| `pageSize` | integer | Results per page |
| `offset` | integer | Skip N results |
| `filter` | string | OData $filter expression |
| `orderBy` | string | OData $orderby expression |
| `selects` | array | Field subset to return |
| `includeTotalCount` | boolean | Include total result count |
| `autoWildCardCodeSearch` | boolean | Wildcard on partial code matches (default: true) |

**Search query parameters (organisation):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchText` | string | Full-text search query |
| `trainingCode` | string | Filter RTOs by training component code |
| `includeImplicit` | boolean | Include implicit scope in results |
| `pageSize` | integer | Results per page |
| `offset` | integer | Skip N results |
| `filter` | string | OData $filter expression |
| `orderBy` | string | OData $orderby expression |

#### 2b. ORGANISATION V1 — 20 endpoints (previously undiscovered!)

| Endpoint | Method | Returns | Verified |
|----------|--------|---------|----------|
| `/api/organisation/{code}` | GET | Organisation summary (classifications, codes, status, isRto) | ✅ |
| `/api/organisation/{code}/addresses` | GET | Postal, principal, head office, delivery addresses | ✅ |
| `/api/organisation/{code}/contacts` | GET | Contact details (name, email, phone, role, address) | ✅ |
| `/api/organisation/{code}/classification` | GET | RTO classification schemes | ✅ |
| `/api/organisation/{code}/cricoscode` | GET | CRICOS codes | ✅ |
| `/api/organisation/{code}/legalname` | GET | Legal name history | ✅ |
| `/api/organisation/{code}/registration` | GET | Registration periods | ✅ |
| `/api/organisation/{code}/registrationmanager` | GET | Registration manager assignments | ✅ |
| `/api/organisation/{code}/regulatorydecision` | GET | Regulatory decisions & events | ✅ |
| `/api/organisation/{code}/restrictions` | GET | Current restrictions | ✅ |
| `/api/organisation/{code}/role` | GET | Organisation roles | ✅ |
| `/api/organisation/{code}/scope` | GET | Full scope of registration (paginated, 32K+ items for large RTOs) | ✅ |
| `/api/organisation/{code}/scopesummary` | GET | Scope summary counts | ✅ |
| `/api/organisation/{code}/tradingname` | GET | Trading name history | ✅ |
| `/api/organisation/{code}/training-packages` | GET | Training packages in scope | ✅ |
| `/api/organisation/{code}/webaddress` | GET | Web addresses | ✅ |
| `/api/organisation/{code}/deliverynotificationhistory/{trainingcode}` | GET | Delivery notification history | ✅ |
| `/api/organisation/{code}/scope/export/csv` | POST | Export scope as CSV | ✅ |
| `/api/organisation/{code}/scope/export/excel` | POST | Export scope as Excel | ✅ |
| `/api/organisation-security-roles` | GET | Security roles for organisations | ✅ |

#### 2c. EXPORT V1 — 12 endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/training/csv` | POST | Export training search results as CSV |
| `/api/training/excel` | POST | Export training search results as Excel |
| `/api/organisation/csv` | POST | Export organisation search results as CSV |
| `/api/organisation/excel` | POST | Export organisation search results as Excel |
| `/api/organisation/scopes/csv` | POST | Export organisation scopes as CSV |
| `/api/organisation/scopes/excel` | POST | Export organisation scopes as Excel |
| `/api/qualification/unitgrids/csv` | POST | Export qualification unit grids as CSV |
| `/api/qualification/unitgrids/excel` | POST | Export qualification unit grids as Excel |
| `/api/skillset/unitgrids/csv` | POST | Export skill set unit grids as CSV |
| `/api/skillset/unitgrids/excel` | POST | Export skill set unit grids as Excel |
| `/api/accreditedcourse/completionmappings/csv` | POST | Export accredited course completion mappings as CSV |
| `/api/accreditedcourse/completionmappings/excel` | POST | Export accredited course completion mappings as Excel |

#### 2d. METADATA V1 — 13 endpoints

| Endpoint | Method | Purpose | Verified |
|----------|--------|---------|----------|
| `/api/metadata` | GET | NTR version info + data export sync datetime | ✅ |
| `/api/classification-purpose` | GET | Classification purpose codes | ✅ |
| `/api/classification-purpose/{code}` | GET | Single classification purpose | ✅ |
| `/api/nrt-classification-scheme` | GET | All NRT classification schemes (ANZSCO, ASCO, ASCED4, ASCED6, QualLevel, NRTType) | ✅ |
| `/api/nrt-classification-scheme/{code}` | GET | Single scheme | ✅ |
| `/api/nrt-classification-scheme/{code}/values` | GET | All values in a scheme (paginated) | ✅ |
| `/api/nrt-classification-scheme/{schemeCode}/values/{code}` | GET | Single value | ✅ |
| `/api/rto-classification-scheme` | GET | RTO classification schemes | ✅ |
| `/api/rto-classification-scheme/{code}` | GET | Single RTO scheme | ✅ |
| `/api/rto-classification-scheme/{code}/values` | GET | All values in an RTO scheme | ✅ |
| `/api/rto-classification-scheme/{schemeCode}/values/{code}` | GET | Single RTO scheme value | ✅ |
| `/api/security-roles` | GET | Available security roles | ✅ |
| `/api/security-roles/{name}` | GET | Single security role | ✅ |

#### 2e. CONTENT V1 — 2 endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/content/bundle/{id}` | GET | Content bundle (HTML description, packaging rules) |
| `/api/content/item/{id}` | GET | Individual content item |

#### 2f. FEEDBACK V1 — 1 endpoint

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/feedback` | POST | Send feedback email to TGA (name, email, subject, message) |

### 3. Training Detail Endpoints (undocumented in Swagger but verified live)

These endpoints are used by the Nuxt.js frontend but NOT listed in any Swagger spec:

| Endpoint | Method | Purpose | Verified |
|----------|--------|---------|----------|
| `/api/training/{code}` | GET | Training component detail (releases, taxonomy, mapping) | ✅ |
| `/api/training/{code}/releases/{releaseId}` | GET | Release detail (assets, packaging, content bundles) | ✅ |
| `/api/training/{code}/releases/{releaseId}/unitgrid` | GET | Unit grid (core/elective units) | ✅ |
| `/api/reports` | GET | Power BI report metadata | ✅ |

### 4. DEWR Modernised Webservices (Future)

- **URL:** `https://www.dewr.gov.au/ntr/modernised-webservices`
- DEWR is officially transitioning SOAP → REST
- Timeline unclear — "working with the VET sector"
- The NTR REST API documented above is likely the result of this modernisation

---

## Search Response Shape

`GET /api/search/training?searchText=electrotechnology&pageSize=5&pageNumber=1`

```json
{
  "count": 5,
  "data": [
    {
      "searchScore": 251.57,
      "code": "UEE22025",
      "title": "Certificate II in Electrotechnology (Career Start)",
      "nrtId": "34ea42cb-...",
      "type": { "id": "qualification", "name": "Qualification" },
      "status": { "id": "current", "isCurrent": true, "name": "Current" },
      "qualificationLevel": { "code": "521", "name": "Certificate II" },
      "trainingPackage": { "code": "UEE", "title": "Electrotechnology Training Package" },
      "latestRelease": { "date": "2025-11-25", "number": "1" },
      "usageRecommendation": { "name": "Current", "startDate": "2025-11-25" },
      "anzsco": { "code": "899914", "name": "Electrical Or Telecommunications Trades Assistant" },
      "asced4": { "code": "0313", "name": "Electrical And Electronic Engineering And Technology" },
      "taxonomyIndustry": [{ "industrySector": "Electrotechnology" }],
      "taxonomyOccupation": [{ "occupation": "Electrotechnology Career Start Trainee" }],
      "supersedes": [{ "code": "UEE22020", "isEquivalent": true }],
      "hasLicensingInformation": false,
      "hasWorkPlacementHours": false
    }
  ]
}
```

---

## Qualification Detail Response Shape

`GET /api/training/UEE30820`

```json
{
  "code": "UEE30820",
  "title": "Certificate III in Electrotechnology Electrician",
  "id": "e73f414f-...",
  "type": "qualification",
  "usageRecommendation": "current",
  "parent": { "code": "UEE", "title": "Electrotechnology Training Package" },
  "releases": [
    { "id": "fbd0eb8d-...", "releaseNumber": "6", "releaseDate": "2023-02-08", "currency": "current" }
  ],
  "taxonomy": {
    "industrySectors": [{ "industrySector": "Electrotechnology" }],
    "occupations": [{ "occupation": "Electrician" }]
  },
  "mappingInformation": [
    { "mapsToCode": "UEE30811", "mapsToTitle": "Certificate III in Electrotechnology Electrician", "isEquivalent": false }
  ],
  "trainingPackageDeveloper": { "name": "Powering Skills Organisation" }
}
```

---

## Unit Grid Response Shape

`GET /api/training/UEE30820/releases/fbd0eb8d-.../unitgrid`

```json
[
  {
    "code": "HLTAID009",
    "title": "Provide cardiopulmonary resuscitation",
    "isEssential": true,
    "isEssentialLabel": "Core",
    "usageRecommendation": "current",
    "hasPreRequisites": false,
    "links": [{ "rel": "training-component", "href": "https://training.gov.au/api/training/hltaid009" }]
  },
  {
    "code": "UEEAS0007",
    "title": "Assemble, mount and connect control gear and switchgear",
    "isEssential": false,
    "isEssentialLabel": "Elective",
    "usageRecommendation": "current",
    "hasPreRequisites": true,
    "preRequisiteContentId": "29fba507-..."
  }
]
```

---

## Release Detail Response Shape

`GET /api/training/UEE30820/releases/fbd0eb8d-...`

```json
{
  "id": "fbd0eb8d-...",
  "releaseNumber": "6",
  "releaseDate": "2023-02-08",
  "currency": "current",
  "packagingInformation": { "core": 990, "elective": 120, "measure": "points" },
  "assets": [
    { "name": "UEE30820_R6.pdf", "url": "https://training.gov.au/assets/UEE/UEE30820_R6.pdf", "type": "completeDocument" },
    { "name": "UEE30820_R6.xml", "url": "https://training.gov.au/assets/UEE/...", "type": "completeDocument" },
    { "name": "UEE30820_R6.docx", "url": "https://training.gov.au/assets/UEE/...", "type": "completeDocument" }
  ],
  "contentBundles": [{ "id": "e74dbed3-...", "typeName": "Default" }]
}
```

---

## Changes Made

### Edge Function (`supabase/functions/tga-search/index.ts`)

| Change | Detail |
|--------|--------|
| **API base** | Kept `https://training.gov.au/api` but all paths updated |
| **Authentication** | Removed Basic Auth — new API is fully public |
| **Search endpoint** | `/search?searchQuery=...` → `/search/training?searchText=...&pageSize=...&pageNumber=...` |
| **Detail endpoint** | `/qualification/{code}?showUnitGrid=true` → multi-step: `/training/{code}` + `/training/{code}/releases/{id}` + `/training/{code}/releases/{id}/unitgrid` |
| **Health check** | `/search?searchQuery=test&pageSize=1` → `/search/training/preview?searchText=test` |
| **Types** | Rewrote all interfaces: `NTRSearchItem`, `NTRDetailResponse`, `NTRReleaseResponse`, `NTRUnitGridItem` |
| **Retry/backoff** | Added exponential backoff (3 retries, 500ms base) for 429/5xx/network errors |
| **Description fetch** | Added content bundle fetch to get HTML description, stripped to plain text |
| **Enriched metadata** | Import now stores packaging, taxonomy, and mapping info in metadata JSONB |

### CRM7 Client (`crm7/src/services/tgaService.ts`)

| Change | Detail |
|--------|--------|
| **TGAQualification** | Added `usageRecommendation`, `qualificationLevel`, `anzsco`, `industrySector` |
| **TGAUnitOfCompetency** | Added `usageRecommendation` |
| **TGAQualificationDetail** | Added `packaging`, `taxonomy`, `mappingInformation` |

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Undocumented API** — endpoints discovered by reverse-engineering, not official docs | Medium | Health check monitors connectivity; retry handles transient failures; DEWR modernisation may formalize these |
| **Breaking changes** — TGA could change API paths without notice | Medium | Versioned Edge Function; health check in `status` action; cache reduces blast radius |
| **Rate limiting** — no published rate limits for the new API | Low | Our Edge Function already limits to 30 req/min per IP; in-memory cache reduces upstream calls |
| **No sandbox/production split** — old credential model is gone | Low | The new API is public; no credential management needed |

---

## Production Readiness Checklist

- [x] Search endpoint verified against live API
- [x] Qualification detail endpoint verified
- [x] Unit grid endpoint verified
- [x] Release detail endpoint verified
- [x] Content bundle (description) endpoint verified
- [x] Edge Function rewritten with new endpoints
- [x] Retry/backoff added (3 retries, exponential)
- [x] Rate limiting preserved (30 req/min)
- [x] CORS headers preserved
- [x] CRM7 client types updated
- [x] Cache TTLs preserved (30min search, 1hr detail)
- [ ] Deploy Edge Function to Supabase (requires `supabase functions deploy tga-search`)
- [ ] End-to-end test via CRM7 QualificationSelector UI
- [ ] Verify import writes to qualifications + units_of_competency tables

---

## Appendix: Old vs New Endpoint Mapping

| Old Endpoint (DEAD) | New Endpoint (LIVE) |
|---------------------|---------------------|
| `GET /api/search?searchQuery=...&pageSize=...` | `GET /api/search/training?searchText=...&pageSize=...&pageNumber=...` |
| `GET /api/qualification/{code}?showUnitGrid=true` | `GET /api/training/{code}` + `GET /api/training/{code}/releases/{id}/unitgrid` |
| Basic Auth required (`WebService.Read` / `Asdf098`) | No auth required |
| `Results[]` array in response | `data[]` array in response |
| `TrainingComponentTypeCode: "Qual"` | `type: { id: "qualification" }` |
| `AQFLevel.Level` (numeric) | `qualificationLevel.name` (string like "Certificate III") |
| `NrtFlag` boolean | `nrtId` UUID (truthy = NRT registered) |

---

## Appendix: Nuxt.js Frontend Config (from HTML source)

```javascript
window.__NUXT__.config = {
  public: {
    apiBaseUrl: "/api",
    apiSwaggerUi: "/swagger",
    apiDrupal: "https://content.training.gov.au",  // CMS content (401 without auth)
    apiReports: "/api/reports",
    authentication: { enabled: false },  // Auth is disabled on the public site
    searchSuggestionSize: 7,
    features: { useFileIndex: { enabled: true } }
  }
}
```

---

## Complete Field Map — All Data Models

### NRT Classification Schemes (from `/api/nrt-classification-scheme`)

| Code | Scheme | Description |
|------|--------|-------------|
| `01` | **ANZSCO** | Australian and New Zealand Standard Classification of Occupations |
| `02` | **ASCO** | Australian Standard Classification of Occupations (legacy) |
| `03` | **ASCED6** | ASCED Module/Unit of Competency Field of Education Identifier |
| `04` | **ASCED4** | ASCED Qualification/Course Field of Education Identifier |
| `05` | **QualLevel** | Qualification/Course Level of Education Identifier |
| `06` | **NRTType** | Nationally Recognised Training Type |

### Qualification Level Codes (scheme `05` — QualLevel)

| Code | Name | Description |
|------|------|-------------|
| `524` | Certificate I | Certificate I in |
| `521` | Certificate II | Certificate II in |
| `514` | Certificate III | Certificate III in |
| `511` | Certificate IV | Certificate IV in |
| `421` | Diploma | Diploma of |
| `411` | Advanced Diploma | Advanced Diploma of |
| `413` | Associate Degree | Associate Degree of |
| `315` | Vocational Degree | Vocational Degree of |
| `312` | Bachelor Degree (Pass) | Bachelor of |
| `311` | Bachelor Degree (Honours) | Bachelor (Hon) of |
| `221` | Graduate Certificate | Graduate Certificate in |
| `211` | Graduate Diploma | Graduate Diploma of |
| `213` | Professional Specialist (Grad Dip Level) | Professional Specialist Qualification At Vocational Graduate Diploma Level in |
| `222` | Professional Specialist (Grad Cert Level) | Professional Specialist Qualification At Vocational Graduate Certificate Level in |
| `611` | Year 12 | Year 12 in |
| `613` | Year 11 | Year 11 in |
| `621` | Year 10 | Year 10 in |
| `991` | Statement Of Attainment Not Identifiable By Level | Course in |
| `912` | Other Non-Award Courses | Other Non-Award Course in |
| `992` | Bridging And Enabling Courses | Bridging And Enabling Courses Not Identifiable By Level in |
| `999` | Education Not Elsewhere Classified | Course in |

### Training Component Types (enum)

```
none | accreditedCourse | qualification | unit | skillSet | qualsSkillsUnits |
trainingPackage | accreditedUnit | accreditedComponents | trainingPackageGroup |
qualificationSpecialisation | trainingPackageComponents | all
```

### Usage Recommendation States (enum)

```
unknown | current | superseded | deleted
```

### NRT Search Status IDs (enum)

```
current | pending | supersededNonEquivalent | supersededEquivalent | deleted | cancelled | nonCurrent
```

---

### Search Result Fields — `TrainingComponentIndexDocumentResult`

Full field map for each item in `/api/search/training` `data[]` array:

| Field | Type | Example | CRM7 Use |
|-------|------|---------|----------|
| `searchScore` | float | `251.47` | Sort relevance |
| `code` | string | `"UEE22025"` | **Primary key** |
| `title` | string | `"Certificate II in Electrotechnology (Career Start)"` | **Display** |
| `titleUpper` | string | `"CERTIFICATE II IN..."` | Search matching |
| `nrtId` | uuid | `"34ea42cb-..."` | NRT registration flag |
| `type.id` | enum | `"qualification"` | **Filter** |
| `type.name` | string | `"Qualification"` | Display |
| `type.sortOrder` | int | `2` | Sort |
| `status.id` | enum | `"current"` | **Filter** |
| `status.isCurrent` | bool | `true` | Filter |
| `status.name` | string | `"Current"` | Display |
| `status.sortOrder` | int | `2` | Sort |
| `qualificationLevel.code` | string | `"521"` | **AQF level code** |
| `qualificationLevel.name` | string | `"Certificate II"` | **AQF level display** |
| `qualificationLevel.description` | string | `"Certificate II in"` | |
| `trainingPackage.code` | string | `"UEE"` | **Package code** |
| `trainingPackage.title` | string | `"Electrotechnology Training Package"` | Display |
| `trainingPackageDeveloper.legalName` | string | `"Powering Skills Organisation"` | |
| `trainingPackageDeveloper.organisationId` | uuid | `"18e91ed6-..."` | Link to org |
| `latestRelease.date` | date | `"2025-11-25"` | **Release date** |
| `latestRelease.number` | string | `"1"` | Release version |
| `usageRecommendation.name` | string | `"Current"` | **Currency status** |
| `usageRecommendation.startDate` | date | `"2025-11-25"` | Effective date |
| `currencyPeriod.startDate` | date | `"2025-11-25"` | |
| `currencyPeriod.endDate` | date | `"9999-12-31"` | |
| `anzsco.code` | string | `"899914"` | **ANZSCO code** |
| `anzsco.name` | string | `"Electrical Or Telecommunications Trades Assistant"` | **Occupation** |
| `anzsco.description` | string | Same as name | |
| `asced4.code` | string | `"0313"` | **ASCED field code** |
| `asced4.name` | string | `"Electrical And Electronic Engineering And Technology"` | **Field of Education** |
| `asced6.code` | string | (nullable) | Module-level ASCED |
| `asced6.name` | string | (nullable) | |
| `asco.code` | string | (nullable) | Legacy ASCO |
| `asco.name` | string | (nullable) | |
| `recognitionManager.code` | string | `"20"` | |
| `recognitionManager.name` | string | `"Skills and Workforce Ministerial Council"` | |
| `recognitionManager.shortName` | string | `"SWMC"` | |
| `taxonomyIndustry[].industrySector` | string | `"Electrotechnology"` | **Industry** |
| `taxonomyIndustry[].description` | string | Long description | |
| `taxonomyIndustry[].id` | string | `"70"` | |
| `taxonomyOccupation[].occupation` | string | `"Electrotechnology Career Start Trainee"` | **Occupation** |
| `taxonomyOccupation[].description` | string | Long description | |
| `taxonomyOccupation[].id` | string | `"3050"` | |
| `supersedes[].code` | string | `"UEE22020"` | Mapping chain |
| `supersedes[].title` | string | | |
| `supersedes[].isEquivalent` | bool | `true` | |
| `supersededBy[].code` | string | (if superseded) | |
| `supersededBy[].title` | string | | |
| `supersededBy[].isEquivalent` | bool | | |
| `preRequisiteUnits[].code` | string | (if unit) | |
| `preRequisiteUnits[].title` | string | | |
| `contentEnquiries.name` | string | (nullable) | |
| `contentEnquiries.email` | string | (nullable) | |
| `contentEnquiries.phone` | string | (nullable) | |
| `copyrightHolder.name` | string | (nullable) | |
| `otherContact.name` | string | (nullable) | |
| `hasLicensingInformation` | bool | `false` | Licensing flag |
| `hasWorkPlacementHours` | bool | `false` | |
| `workPlacementHours` | int? | (nullable) | |
| `isConfidential` | bool | `false` | |
| `specialisations` | string? | (nullable) | |
| `statusTypeRanking` | int | `23` | Combined sort |

---

### Training Component Detail Fields — `TrainingComponent`

Full field map from `/api/training/{code}` (Organisation V1 Swagger spec):

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | National code (e.g., `"UEE30820"`) |
| `title` | string | Full title |
| `id` | uuid | NRT internal identifier |
| `type` | enum | `qualification`, `unit`, `skillSet`, `trainingPackage`, etc. |
| `status` | enum | `current`, `pending`, `deleted`, `superseded`, `cancelled`, `nonCurrent` |
| `statusLabel` | string | Human-readable status |
| `usageRecommendation` | enum | `unknown`, `current`, `superseded`, `deleted` |
| `usageRecommendationLabel` | string | Human-readable recommendation |
| `parent.code` | string | Parent training package code |
| `parent.title` | string | Parent training package title |
| `parent.id` | uuid | Parent training package NRT ID |
| `developmentStandard` | enum | `current`, `legacy`, `streamline` |
| `isConfidential` | bool | |
| `isInternalUseOnly` | bool | |
| `isCompletionMappingInternalUseOnly` | bool | |
| `reviewDate` | date? | Next review date |
| `trainingPackageDeveloper.name` | string | Developer organisation name |
| `trainingPackageDeveloper.organisationId` | uuid | Developer org ID |
| `trainingPackageDeveloper.webAddresses[]` | string[] | Developer web URLs |
| `taxonomy.industrySectors[].industrySector` | string | Industry sector name |
| `taxonomy.industrySectors[].industrySectorId` | string | Industry sector ID |
| `taxonomy.industrySectors[].description` | string | |
| `taxonomy.occupations[].occupation` | string | Occupation name |
| `taxonomy.occupations[].occupationId` | string | Occupation ID |
| `taxonomy.occupations[].description` | string | |
| `mappingInformation[].code` | string | This component's code |
| `mappingInformation[].mapsToCode` | string | Superseding/superseded code |
| `mappingInformation[].mapsToTitle` | string | |
| `mappingInformation[].mapsToId` | uuid | |
| `mappingInformation[].isEquivalent` | bool | Whether mapping is equivalent |
| `mappingInformation[].date` | date? | Mapping date |
| `mappingInformation[].notes` | string? | |
| `contacts[].contactType` | enum | `individual`, `group`, `organisation` |
| `contacts[].firstName` | string | |
| `contacts[].lastName` | string | |
| `contacts[].email` | string | |
| `contacts[].phone` | string | |
| `contacts[].role` | string | |
| `contacts[].roleDescription` | string | |
| `currencyPeriods[].startDate` | date | |
| `currencyPeriods[].endDate` | date | |
| `currencyPeriods[].authority` | string | |
| `restrictions[].restriction` | string | |
| `restrictions[].startDate` | date | |
| `restrictions[].endDate` | date? | |
| `assets[].name` | string | File name (e.g., `"UEE30820_R6.pdf"`) |
| `assets[].url` | string | Download URL |
| `assets[].type` | enum | `completeDocument`, `headerInformation`, `assessment`, `creditArrangements`, `unitPackage` |
| `assets[].size` | int64 | Bytes |
| `assets[].isAvailable` | bool | |
| `assets[].lastPublishedDate` | datetime | |
| `releases[].id` | uuid | Release ID (required for unit grid) |
| `releases[].releaseNumber` | string | |
| `releases[].releaseDate` | date | |
| `releases[].currency` | enum | `current`, `replaced`, `draft` |
| `releases[].packagingInformation.core` | int | Core unit count/points |
| `releases[].packagingInformation.elective` | int | Elective count/points |
| `releases[].packagingInformation.measure` | enum | `units` or `points` |
| `releases[].assets[]` | array | Same asset structure |
| `releases[].contentBundles[].id` | uuid | For description fetch |
| `releases[].contentBundles[].typeName` | string | `"Default"` |
| `releases[].specializations[].code` | string | |
| `releases[].specializations[].title` | string | |
| `releases[].workPlacementHours` | int? | |
| `contentBundles[].id` | uuid | Component-level bundles |
| `preRequisites[].code` | string | Pre-requisite unit code |
| `preRequisites[].title` | string | |

---

### Unit Grid Fields — from `/api/training/{code}/releases/{id}/unitgrid`

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Unit code (e.g., `"HLTAID009"`) |
| `title` | string | Unit title |
| `isEssential` | bool | `true` = Core, `false` = Elective |
| `isEssentialLabel` | string | `"Core"` or `"Elective"` |
| `usageRecommendation` | string | `"current"`, `"superseded"`, etc. |
| `hasPreRequisites` | bool | Whether unit has prerequisites |
| `isPreRequisite` | bool | Whether this unit IS a prerequisite for others |
| `preRequisiteContentId` | uuid? | Content ID for prerequisite details |
| `preRequisites[].code` | string | (only if `?include=prerequisites`) |
| `preRequisites[].title` | string | |
| `links[].rel` | string | `"training-component"` |
| `links[].href` | string | Full URL to unit detail |

---

### Organisation Fields — `Organisation` (from `/api/organisation/{code}`)

| Field | Type | Description |
|-------|------|-------------|
| `organisationId` | uuid | Internal NRT identifier |
| `code` | string | Organisation code (e.g., `"0275"`) |
| `isRto` | bool | Registered Training Organisation flag |
| `status` | enum | `current`, `suspended`, `pending`, etc. |
| `statusLabel` | string | Human-readable status |
| `rtoStatus` | enum | Same enum as status |
| `rtoStatusLabel` | string | |
| `codes[].code` | string | Historical codes |
| `codes[].startDate` | date | |
| `classifications[].isPrimary` | bool | |
| `classifications[].purpose` | string | |
| `classifications[].purposeCode` | string | |
| `classifications[].scheme` | string | |
| `classifications[].schemeCode` | string | |
| `classifications[].value` | string | |
| `classifications[].valueCode` | string | |

#### Organisation Sub-Endpoints

**`/addresses`** → `OrganisationAddress[]`

| Field | Type |
|-------|------|
| `addressType` | enum: `postal`, `principal`, `headOffice`, `deliveryLocation` |
| `address.line1` | string |
| `address.line2` | string? |
| `address.suburb` | string |
| `address.state` | string |
| `address.postcode` | string |
| `address.country` | string |
| `address.countryCodeAlpha3` | string |
| `address.fullAddress` | string |
| `startDate` | date |
| `endDate` | date? |

**`/contacts`** → `Contact[]`

| Field | Type |
|-------|------|
| `contactType` | enum: `individual`, `group`, `organisation` |
| `title` | string |
| `firstName` | string |
| `lastName` | string |
| `email` | string |
| `phone` | string |
| `mobile` | string? |
| `fax` | string? |
| `jobTitle` | string |
| `organisationName` | string |
| `role` | string (e.g., `"RegistrationEnquiries"`, `"ChiefExecutive"`, `"PublicEnquiries"`) |
| `roleDescription` | string |
| `postalAddress.*` | same as Address |
| `startDate` | date |
| `endDate` | date? |

**`/scope`** → `RtoScopeWithDelivery[]` (paginated, can be 32K+ items)

| Field | Type |
|-------|------|
| `code` | string (training component code) |
| `title` | string |
| `componentType` | enum: `qualification`, `unit`, etc. |
| `componentTypeLabel` | string |
| `nrtId` | uuid |
| `extent` | string code |
| `extentLabel` | string (e.g., `"Deliver and assess"`) |
| `isImplicit` | bool (implicit from package vs explicit) |
| `status` | enum |
| `statusLabel` | string |
| `startDate` | date |
| `endDate` | date? |
| `deliveryAct` | bool? |
| `deliveryNsw` | bool? |
| `deliveryVic` | bool? |
| `deliveryQld` | bool? |
| `deliverySa` | bool? |
| `deliveryWa` | bool? |
| `deliveryTas` | bool? |
| `deliveryNt` | bool? |
| `deliveryInternational` | bool? |
| `isInternational` | bool? |

**`/registration`** → `RegistrationPeriod[]`

| Field | Type |
|-------|------|
| `startDate` | date |
| `endDate` | date? |
| `legalAuthority` | string |
| `exerciser` | string |
| `endReason` | string? |
| `endReasonComments` | string? |
| `outcome` | string? |
| `outcomeDescription` | string? |

**`/regulatorydecision`** → `RtoRegulatoryDecision[]`

| Field | Type |
|-------|------|
| `decision` | string |
| `decisionType` | string |
| `decisionStatus` | string |
| `decisionLevel` | string |
| `decisionMaker` | string |
| `decisionMadeUnder` | string |
| `decisionMadeUnderUrl` | string |
| `effectiveDate` | date |
| `startDate` | date |
| `endDate` | date? |
| `reference` | string |
| `additionalDetails` | string? |
| `isHistoric` | bool |
| `reviewStatus` | string? |
| `decisionEvents[].eventDate` | date |
| `decisionEvents[].eventStatus` | string |
| `decisionEvents[].eventDetails` | string |
| `decisionEvents[].decisionMaker` | string |

---

### Organisation Search Result Fields — `OrganisationIndexDocumentResult`

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Organisation code |
| `codeInt` | int | Numeric code |
| `organisationId` | uuid | |
| `legalName` | string | |
| `tradingNames` | string[] | |
| `isRto` | bool | |
| `isCurrent` | bool | |
| `rtoType` | string? | |
| `searchScore` | float | |
| `abns` | string[] | ABN numbers |
| `acn` | string? | ACN number |
| `headOfficeAddress.*` | Address | Head office |
| `registration.status` | enum | |
| `registration.statusLabel` | string | |
| `registration.startDate` | date | |
| `registration.endDate` | date? | |
| `registration.initialRegistrationDate` | date | |
| `registration.legalAuthority` | string | |
| `registrationManager.code` | string | |
| `registrationManager.name` | string | |
| `registrationManager.shortName` | string | |
| `registrationEnquiries.*` | Contact | |
| `publicEnquiries.*` | Contact | |
| `ceo.*` | Contact | |
| `roles[].id` | string | |
| `roles[].name` | string | |
| `roles[].shortName` | string | |
| `delivery.act` | bool | |
| `delivery.nsw` | bool | |
| `delivery.vic` | bool | |
| `delivery.qld` | bool | |
| `delivery.sa` | bool | |
| `delivery.wa` | bool | |
| `delivery.tas` | bool | |
| `delivery.nt` | bool | |
| `delivery.international` | bool | |
| `scopeExplicit` | int? | Count of explicit scope items |
| `scopeImplicit` | int? | Count of implicit scope items |
| `webAddresses` | string[] | |
| `hasCurrentRestrictionOrRegulatoryDecision` | bool | |
| `updatedDate` | datetime | |

---

### Content Bundle Fields — from `/api/content/bundle/{id}`

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Bundle ID |
| `title` | string? | |
| `typeCode` | string | Category code |
| `typeName` | string | e.g., `"Default"` |
| `typeDescription` | string? | |
| `items[].id` | uuid | Content item ID |
| `items[].sequence` | int | Sort order |
| `items[].content` | string | **HTML/Markdown/Plain text content** |
| `items[].contentType` | string | Content type name |
| `items[].contentTypeCode` | string | Content type code |
| `items[].format` | enum | `plainText`, `markdown`, `html` |
| `items[].title` | string? | |
| `items[].createdDate` | datetime? | |
| `items[].updatedDate` | datetime? | |

---

### Facet Response Fields — from `/api/search/training/facets`

Returns faceted counts for filtering. Response shape:

```json
{
  "count": 0,
  "data": [],
  "facets": [
    { "propertyName": "Type/Id", "counts": { "4": 3006, "2": 502, "8": 213 } },
    { "propertyName": "QualificationLevel/Code", "counts": { "511": 144, "514": 117 } },
    { "propertyName": "RecognitionManager/Code", "counts": { "20": 3508 } },
    { "propertyName": "Status/Id", "counts": { "-5": 1803, "0": 737 } }
  ]
}
```

**Facet property names:**

- `Type/Id` — Training component type (maps to TrainingComponentTypes enum numeric values)
- `QualificationLevel/Code` — AQF level code (maps to QualLevel scheme)
- `RecognitionManager/Code` — Recognition manager
- `Status/Id` — NRT status

---

### Metadata Response — from `/api/metadata`

```json
{
  "dataExportSynchronisationDateTime": "2026-03-03T12:11:34+00:00",
  "informationalVersion": "4.224.3-45+Branch.master.Sha.9cc54a01...",
  "version": "4.224.3.45"
}
```

---

### Reference Pages

- **ANZSCO and ASCED Classifications:** `https://training.gov.au/support/anzsco-and-asced-classifications`
- **Standalone Data Fields:** `https://training.gov.au/support/standalone-data-fields`
- **Swagger UI:** `https://training.gov.au/swagger/index.html`
  - Content V1: `?urls.primaryName=CONTENT+-+V1`
  - Export V1: `?urls.primaryName=EXPORT+-+V1`
  - Feedback V1: `?urls.primaryName=FEEDBACK+-+V1`
  - Metadata V1: `?urls.primaryName=METADATA+-+V1`
  - Organisation V1: `?urls.primaryName=ORGANISATION+-+V1`
  - Search V1: `?urls.primaryName=SEARCH+-+V1`
