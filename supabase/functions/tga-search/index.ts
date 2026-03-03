/**
 * tga-search — Supabase Edge Function
 *
 * Proxies Training.gov.au (TGA) NTR REST API for qualification search,
 * detail lookup, and import into the local Supabase database.
 *
 * Actions:
 *   search        — Search qualifications by query string (paginated, filterable)
 *   suggestions   — Fuzzy autocomplete suggestions for search
 *   facets        — Faceted counts (type, qual level, status) for search filtering
 *   qualification — Get qualification detail by code (with units)
 *   organisation  — Get RTO/organisation detail by code
 *   import        — Import a qualification + units into the DB
 *   sync          — Batch import by keyword list
 *   status        — Health check / stats
 *
 * The function uses the NTR REST API (https://training.gov.au/api).
 * Swagger: https://training.gov.au/swagger/index.html
 * 6 specs: Search V1, Organisation V1, Export V1, Metadata V1, Content V1, Feedback V1
 * No authentication is required — the API is fully public.
 *
 * Documented endpoints (Swagger OpenAPI 3.0.1):
 *   Search V1:
 *     GET /api/search/training?searchText=...&pageSize=...&offset=...&filter=...&orderBy=...
 *     GET /api/search/training/preview?searchText=...
 *     GET /api/search/training/facets?searchText=...&facetProperty=...
 *     GET /api/search/training/suggestions?searchText=...&useFuzzyMatching=...
 *     GET /api/search/organisation?searchText=...&trainingCode=...
 *     GET /api/search/organisation/preview?searchText=...
 *   Organisation V1:
 *     GET /api/organisation/{code}
 *     GET /api/organisation/{code}/addresses|contacts|scope|registration|...
 *   Metadata V1:
 *     GET /api/metadata
 *     GET /api/nrt-classification-scheme
 *     GET /api/nrt-classification-scheme/{code}/values
 *   Content V1:
 *     GET /api/content/bundle/{id}
 *     GET /api/content/item/{id}
 *
 * Undocumented but verified live:
 *   GET /api/training/{code}
 *   GET /api/training/{code}/releases/{releaseId}
 *   GET /api/training/{code}/releases/{releaseId}/unitgrid
 *
 * SOAP sandbox still alive (credentials: WebService.Read / Asdf098):
 *   https://ws.sandbox.training.gov.au/Deewr.Tga.WebServices/OrganisationService.svc
 *   https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices/TrainingComponentService.svc
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Configuration ────────────────────────────────────────────────────────────

const TGA_API_BASE = "https://training.gov.au/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-memory cache (per invocation warm start)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttl = CACHE_TTL_MS): void {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

// ─── NTR REST API types ───────────────────────────────────────────────────────

/** Full search result item from /api/search/training */
interface NTRSearchItem {
  searchScore?: number;
  code?: string;
  title?: string;
  titleUpper?: string;
  nrtId?: string;
  type?: { id?: string; name?: string; sortOrder?: number };
  status?: { id?: string; isCurrent?: boolean; name?: string };
  usageRecommendation?: { name?: string; startDate?: string };
  qualificationLevel?: { code?: string; name?: string; description?: string };
  trainingPackage?: { code?: string; title?: string };
  trainingPackageDeveloper?: { legalName?: string; organisationId?: string };
  latestRelease?: { date?: string; number?: string };
  currencyPeriod?: { startDate?: string; endDate?: string };
  supersedes?: Array<{ code?: string; title?: string; isEquivalent?: boolean }>;
  supersededBy?: Array<{ code?: string; title?: string; isEquivalent?: boolean }>;
  taxonomyIndustry?: Array<{ id?: string; industrySector?: string; description?: string }>;
  taxonomyOccupation?: Array<{ id?: string; occupation?: string; description?: string }>;
  anzsco?: { code?: string; name?: string; description?: string };
  asced4?: { code?: string; name?: string; description?: string };
  hasLicensingInformation?: boolean;
  hasWorkPlacementHours?: boolean;
}

interface NTRSearchResponse {
  count?: number;
  data?: NTRSearchItem[];
}

/** Detail response from /api/training/{code} */
interface NTRDetailResponse {
  code?: string;
  title?: string;
  id?: string;
  type?: string;
  developmentStandard?: string;
  usageRecommendation?: string;
  usageRecommendationLabel?: string;
  parent?: { code?: string; id?: string; title?: string };
  releases?: Array<{
    id?: string;
    releaseNumber?: string;
    releaseDate?: string;
    currency?: string;
    currencyChangeDate?: string;
  }>;
  taxonomy?: {
    industrySectors?: Array<{ industrySector?: string; industrySectorId?: number; description?: string }>;
    occupations?: Array<{ occupation?: string; occupationId?: number; description?: string }>;
  };
  mappingInformation?: Array<{
    code?: string;
    title?: string;
    mapsToCode?: string;
    mapsToTitle?: string;
    isEquivalent?: boolean;
    date?: string;
  }>;
  trainingPackageDeveloper?: { name?: string; organisationId?: string };
}

/** Release detail from /api/training/{code}/releases/{releaseId} */
interface NTRReleaseResponse {
  id?: string;
  releaseNumber?: string;
  releaseDate?: string;
  currency?: string;
  packagingInformation?: { core?: number; elective?: number; measure?: string };
  assets?: Array<{ name?: string; url?: string; type?: string; size?: number }>;
  contentBundles?: Array<{ id?: string; typeName?: string }>;
  specializations?: Array<unknown>;
}

/** Unit grid item from /api/training/{code}/releases/{releaseId}/unitgrid */
interface NTRUnitGridItem {
  code?: string;
  title?: string;
  isEssential?: boolean;
  isEssentialLabel?: string;
  usageRecommendation?: string;
  usageRecommendationLabel?: string;
  hasPreRequisites?: boolean;
  preRequisiteContentId?: string;
  links?: Array<{ rel?: string; href?: string }>;
}

// ─── Fetch with retry + exponential backoff ─────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function tgaFetch(path: string): Promise<Response> {
  const url = `${TGA_API_BASE}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      // Retry on 429 or 5xx
      if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = resp.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`TGA API ${resp.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(
          `TGA API ${resp.status}: ${resp.statusText} — ${body.slice(0, 200)}`
        );
      }

      return resp;
    } catch (err) {
      if (attempt < MAX_RETRIES && err instanceof TypeError) {
        // Network error — retry
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`TGA fetch error, retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms:`, err);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("TGA API: max retries exceeded");
}

// ─── Action handlers ──────────────────────────────────────────────────────────

interface SearchParams {
  query: string;
  limit?: number;
  includeSuperseded?: boolean;
}

async function handleSearch(params: SearchParams) {
  const { query, limit = 20, includeSuperseded = false } = params;

  if (!query || query.length < 3) {
    throw new Error("Search query must be at least 3 characters");
  }

  const cacheKey = `search:${query}:${limit}:${includeSuperseded}`;
  const cached = getCached<Awaited<ReturnType<typeof mapSearchResults>>>(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    searchText: query,
    pageSize: String(limit),
    pageNumber: "1",
  });

  const resp = await tgaFetch(`/search/training?${qs}`);
  const data: NTRSearchResponse = await resp.json();

  const result = mapSearchResults(data, includeSuperseded);
  setCache(cacheKey, result);
  return result;
}

function mapSearchResults(data: NTRSearchResponse, includeSuperseded: boolean) {
  const items = (data.data ?? [])
    .filter((item) => {
      // Only qualifications and accredited courses
      const typeId = item.type?.id ?? "";
      if (typeId !== "qualification" && typeId !== "accreditedCourse") return false;
      // Filter superseded unless requested
      if (!includeSuperseded && !item.status?.isCurrent) return false;
      return true;
    })
    .map((item) => ({
      code: item.code ?? "",
      title: item.title ?? "",
      level: qualLevelCodeToNumeric(item.qualificationLevel?.code) || parseQualLevel(item.qualificationLevel?.name),
      status: item.status?.name ?? "Unknown",
      releaseDate: item.latestRelease?.date ?? "",
      trainingPackage: item.trainingPackage
        ? {
            code: item.trainingPackage.code ?? "",
            title: item.trainingPackage.title ?? "",
          }
        : undefined,
      nrtFlag: !!item.nrtId,
      usageRecommendation: item.usageRecommendation?.name ?? "",
      qualificationLevel: item.qualificationLevel?.name ?? "",
      anzsco: item.anzsco ? { code: item.anzsco.code ?? "", name: item.anzsco.name ?? "" } : undefined,
      industrySector: item.taxonomyIndustry?.[0]?.industrySector ?? "",
    }));

  return {
    results: items,
    count: items.length,
    source: "training.gov.au",
  };
}

/**
 * Parse AQF level name/title to numeric level (1-8).
 * Uses official QualLevel scheme codes from /api/nrt-classification-scheme/05/values:
 *   524=Cert I, 521=Cert II, 514=Cert III, 511=Cert IV,
 *   421=Diploma, 411=Adv Diploma, 221=Grad Cert, 211=Grad Diploma
 */
function parseQualLevel(name?: string): number {
  if (!name) return 0;
  const lower = name.toLowerCase();
  // Order matters — check longer phrases first to avoid false matches
  if (lower.includes("graduate diploma")) return 8;
  if (lower.includes("graduate certificate")) return 7;
  if (lower.includes("advanced diploma")) return 6;
  if (lower.includes("certificate iv")) return 4;
  if (lower.includes("certificate iii")) return 3;
  if (lower.includes("certificate ii")) return 2;
  if (lower.includes("certificate i")) return 1;
  if (lower.includes("diploma")) return 5;
  if (lower.includes("bachelor")) return 9;
  return 0;
}

/** Map QualLevel scheme code to numeric AQF level */
function qualLevelCodeToNumeric(code?: string): number {
  const map: Record<string, number> = {
    "524": 1, "521": 2, "514": 3, "511": 4,
    "421": 5, "411": 6, "413": 6, // Associate Degree ≈ Advanced Diploma
    "221": 7, "211": 8, "222": 7, "213": 8,
    "312": 9, "311": 9, "315": 9, // Bachelor/Vocational Degree
  };
  return map[code ?? ""] ?? 0;
}

async function handleQualification(params: { code: string }) {
  const { code } = params;
  if (!code) throw new Error("Qualification code is required");

  const cacheKey = `qual:${code}`;
  const cached = getCached<Awaited<ReturnType<typeof fetchQualificationDetail>>>(cacheKey);
  if (cached) return cached;

  const result = await fetchQualificationDetail(code);
  setCache(cacheKey, result, 60 * 60 * 1000); // 1 hour
  return result;
}

async function fetchQualificationDetail(code: string) {
  // Step 1: Fetch qualification summary (releases, taxonomy, mapping)
  const detailResp = await tgaFetch(`/training/${encodeURIComponent(code)}`);
  const detail: NTRDetailResponse = await detailResp.json();

  // Step 2: Find the current release
  const currentRelease = (detail.releases ?? []).find(
    (r) => r.currency === "current"
  ) ?? (detail.releases ?? [])[0];

  let description = "";
  let packagingInfo: NTRReleaseResponse["packagingInformation"] | undefined;
  const coreUnits: Array<{ code: string; title: string; isCore: boolean; usageRecommendation: string }> = [];
  const electiveUnits: Array<{ code: string; title: string; isCore: boolean; usageRecommendation: string }> = [];

  if (currentRelease?.id) {
    // Step 3: Fetch release detail (packaging, assets)
    try {
      const releaseResp = await tgaFetch(
        `/training/${encodeURIComponent(code)}/releases/${currentRelease.id}`
      );
      const releaseData: NTRReleaseResponse = await releaseResp.json();
      packagingInfo = releaseData.packagingInformation;

      // Step 3b: Fetch content bundle for description
      if (releaseData.contentBundles?.[0]?.id) {
        try {
          const contentResp = await tgaFetch(
            `/content/bundle/${releaseData.contentBundles[0].id}?itemType=0001`
          );
          const contentData = await contentResp.json();
          const descItem = contentData?.items?.find(
            (i: { contentTypeCode?: string }) => i.contentTypeCode === "0001"
          );
          if (descItem?.content) {
            // Strip HTML tags for plain text description
            description = descItem.content
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          }
        } catch {
          // Non-fatal: description is optional
        }
      }
    } catch {
      // Non-fatal: release detail is optional
    }

    // Step 4: Fetch unit grid
    try {
      const unitResp = await tgaFetch(
        `/training/${encodeURIComponent(code)}/releases/${currentRelease.id}/unitgrid`
      );
      const units: NTRUnitGridItem[] = await unitResp.json();

      for (const unit of units) {
        const mapped = {
          code: unit.code ?? "",
          title: unit.title ?? "",
          isCore: unit.isEssential ?? false,
          usageRecommendation: unit.usageRecommendationLabel ?? "Unknown",
        };
        if (mapped.isCore) {
          coreUnits.push(mapped);
        } else {
          electiveUnits.push(mapped);
        }
      }
    } catch {
      // Non-fatal: units are optional for the detail view
    }
  }

  return {
    code: detail.code ?? code,
    title: detail.title ?? "",
    description,
    level: parseQualLevel(detail.title),
    status: detail.usageRecommendationLabel ?? "Unknown",
    releaseDate: currentRelease?.releaseDate ?? "",
    trainingPackage: detail.parent
      ? {
          code: detail.parent.code ?? "",
          title: detail.parent.title ?? "",
        }
      : undefined,
    nrtFlag: !!detail.id,
    unitsOfCompetency: {
      core: coreUnits,
      elective: electiveUnits,
    },
    packaging: packagingInfo ?? null,
    taxonomy: {
      industrySectors: (detail.taxonomy?.industrySectors ?? []).map((s) => s.industrySector ?? ""),
      occupations: (detail.taxonomy?.occupations ?? []).map((o) => o.occupation ?? ""),
    },
    mappingInformation: (detail.mappingInformation ?? []).map((m) => ({
      mapsToCode: m.mapsToCode ?? "",
      mapsToTitle: m.mapsToTitle ?? "",
      isEquivalent: m.isEquivalent ?? false,
    })),
    _source: "training.gov.au",
  };
}

interface ImportParams {
  code: string;
  tenant_id: string;
}

async function handleImport(params: ImportParams) {
  const { code, tenant_id } = params;
  if (!code) throw new Error("Qualification code is required");
  if (!tenant_id) throw new Error("tenant_id is required");

  // Fetch qualification detail from TGA
  const qual = await fetchQualificationDetail(code);

  // Create Supabase admin client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Determine AQF level text from numeric level
  const levelMap: Record<number, string> = {
    1: "Certificate I",
    2: "Certificate II",
    3: "Certificate III",
    4: "Certificate IV",
    5: "Diploma",
    6: "Advanced Diploma",
    7: "Graduate Certificate",
    8: "Graduate Diploma",
  };

  // Upsert qualification
  const qualRow = {
    tenant_id,
    code: qual.code,
    title: qual.title,
    description: qual.description || null,
    level: levelMap[qual.level] ?? null,
    field: qual.trainingPackage?.title ?? null,
    training_package_code: qual.trainingPackage?.code ?? null,
    status: qual.status === "Current" ? "active" : "superseded",
    is_apprenticeship: true,
    release_date: qual.releaseDate ? qual.releaseDate : null,
    units: JSON.stringify([
      ...qual.unitsOfCompetency.core.map((u: { code: string; title: string }) => ({
        code: u.code,
        title: u.title,
        isCore: true,
      })),
      ...qual.unitsOfCompetency.elective.map((u: { code: string; title: string }) => ({
        code: u.code,
        title: u.title,
        isCore: false,
      })),
    ]),
    metadata: {
      imported_from: "training.gov.au",
      imported_at: new Date().toISOString(),
      tga_status: qual.status,
      nrt_flag: qual.nrtFlag,
      packaging: qual.packaging ?? null,
      taxonomy: qual.taxonomy ?? null,
      mapping: qual.mappingInformation ?? null,
    },
    updated_at: new Date().toISOString(),
  };

  // Check if qualification already exists for this tenant
  const { data: existing } = await supabase
    .from("qualifications")
    .select("id")
    .eq("tenant_id", tenant_id)
    .eq("code", qual.code)
    .maybeSingle();

  let qualificationId: string;

  if (existing) {
    // Update existing
    const { data: updated, error: updateErr } = await supabase
      .from("qualifications")
      .update(qualRow)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateErr) throw new Error(`Failed to update qualification: ${updateErr.message}`);
    qualificationId = updated.id;
  } else {
    // Insert new
    const { data: inserted, error: insertErr } = await supabase
      .from("qualifications")
      .insert(qualRow)
      .select("id")
      .single();

    if (insertErr) throw new Error(`Failed to insert qualification: ${insertErr.message}`);
    qualificationId = inserted.id;
  }

  // Upsert units of competency
  let unitsImported = 0;
  const allUnits = [
    ...qual.unitsOfCompetency.core.map((u) => ({ ...u, isCore: true })),
    ...qual.unitsOfCompetency.elective.map((u) => ({ ...u, isCore: false })),
  ];

  for (const unit of allUnits) {
    const unitRow = {
      tenant_id,
      unit_code: unit.code,
      unit_name: unit.title,
      description: `Imported from Training.gov.au — ${unit.isCore ? "Core" : "Elective"} unit of ${qual.code}`,
      training_package: qual.trainingPackage?.code ?? null,
      is_active: true,
    };

    // Check if unit exists
    const { data: existingUnit } = await supabase
      .from("units_of_competency")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("unit_code", unit.code)
      .maybeSingle();

    if (existingUnit) {
      await supabase
        .from("units_of_competency")
        .update({ ...unitRow, updated_at: new Date().toISOString() })
        .eq("id", existingUnit.id);
    } else {
      await supabase.from("units_of_competency").insert(unitRow);
    }
    unitsImported++;
  }

  return {
    message: `Successfully imported ${qual.code} — ${qual.title}`,
    qualification_id: qualificationId,
    imported: true,
    units_imported: unitsImported,
    source: "training.gov.au",
  };
}

interface SyncParams {
  keywords: string[];
  tenant_id: string;
}

async function handleSync(params: SyncParams) {
  const { keywords, tenant_id } = params;
  if (!keywords?.length) throw new Error("keywords array is required");
  if (!tenant_id) throw new Error("tenant_id is required");

  const results: Array<{
    keyword: string;
    found: number;
    imported: number;
    errors: string[];
  }> = [];
  let totalImported = 0;

  for (const keyword of keywords) {
    const entry = { keyword, found: 0, imported: 0, errors: [] as string[] };

    try {
      const searchResult = await handleSearch({
        query: keyword,
        limit: 10,
        includeSuperseded: false,
      });
      entry.found = searchResult.count;

      for (const qual of searchResult.results) {
        try {
          await handleImport({ code: qual.code, tenant_id });
          entry.imported++;
          totalImported++;
        } catch (err) {
          entry.errors.push(
            `${qual.code}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
    } catch (err) {
      entry.errors.push(
        err instanceof Error ? err.message : "Unknown error"
      );
    }

    results.push(entry);
  }

  return {
    message: `Sync complete: ${totalImported} qualifications imported`,
    totalImported,
    results,
  };
}

// ─── Suggestions handler (Swagger: Search V1 — /search/training/suggestions) ──

interface SuggestionsParams {
  query: string;
  size?: number;
  fuzzy?: boolean;
}

async function handleSuggestions(params: SuggestionsParams) {
  const { query, size = 7, fuzzy = true } = params;
  if (!query || query.length < 2) {
    throw new Error("Suggestion query must be at least 2 characters");
  }

  const cacheKey = `suggest:${query}:${size}:${fuzzy}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    searchText: query,
    size: String(size),
    useFuzzyMatching: String(fuzzy),
  });

  const resp = await tgaFetch(`/search/training/suggestions?${qs}`);
  const data = await resp.json();

  const result = {
    suggestions: Array.isArray(data) ? data : (data?.value ?? []),
    source: "training.gov.au",
  };
  setCache(cacheKey, result, 10 * 60 * 1000); // 10 min cache
  return result;
}

// ─── Facets handler (Swagger: Search V1 — /search/training/facets) ───────────

interface FacetsParams {
  query?: string;
  facetProperty?: string;
  filter?: string;
}

async function handleFacets(params: FacetsParams) {
  const { query, facetProperty, filter } = params;

  const cacheKey = `facets:${query ?? ""}:${facetProperty ?? ""}:${filter ?? ""}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams();
  if (query) qs.set("searchText", query);
  if (facetProperty) qs.set("facetProperty", facetProperty);
  if (filter) qs.set("filter", filter);

  const resp = await tgaFetch(`/search/training/facets?${qs}`);
  const data = await resp.json();

  const result = {
    facets: data?.facets ?? [],
    count: data?.count ?? 0,
    source: "training.gov.au",
  };
  setCache(cacheKey, result, 15 * 60 * 1000); // 15 min cache
  return result;
}

// ─── Organisation handler (Swagger: Organisation V1) ─────────────────────────

interface OrganisationParams {
  code: string;
  include?: string[]; // sub-endpoints: addresses, contacts, scope, registration, etc.
}

async function handleOrganisation(params: OrganisationParams) {
  const { code, include = [] } = params;
  if (!code) throw new Error("Organisation code is required");

  const cacheKey = `org:${code}:${include.sort().join(",")}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  // Fetch main organisation detail
  const mainResp = await tgaFetch(`/organisation/${encodeURIComponent(code)}`);
  const org = await mainResp.json();

  const result: Record<string, unknown> = {
    ...org,
    _source: "training.gov.au",
  };

  // Fetch requested sub-endpoints in parallel
  const validSubEndpoints = new Set([
    "addresses", "contacts", "classification", "cricoscode",
    "legalname", "registration", "registrationmanager",
    "regulatorydecision", "restrictions", "role", "scope",
    "scopesummary", "tradingname", "training-packages", "webaddress",
  ]);

  const subFetches = include
    .filter((sub) => validSubEndpoints.has(sub))
    .map(async (sub) => {
      try {
        const subResp = await tgaFetch(
          `/organisation/${encodeURIComponent(code)}/${sub}${sub === "scope" ? "?pageSize=50" : ""}`
        );
        return { key: sub, data: await subResp.json() };
      } catch (err) {
        console.warn(`Failed to fetch org sub-endpoint /${sub}:`, err);
        return { key: sub, data: null };
      }
    });

  const subResults = await Promise.all(subFetches);
  for (const { key, data } of subResults) {
    if (data !== null) result[key] = data;
  }

  setCache(cacheKey, result, 60 * 60 * 1000); // 1 hour cache
  return result;
}

async function handleStatus(params: { tenant_id?: string }) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Count imported qualifications
  let query = supabase
    .from("qualifications")
    .select("id", { count: "exact", head: true });

  if (params.tenant_id) {
    query = query.eq("tenant_id", params.tenant_id);
  }

  const { count: importedCount } = await query;

  // Check TGA API health using the new NTR search endpoint
  let tgaStatus = "unknown";
  try {
    const resp = await tgaFetch("/search/training/preview?searchText=test");
    if (resp.ok) tgaStatus = "connected";
  } catch {
    tgaStatus = "unavailable";
  }

  return {
    status: "ok",
    tga_api: tgaStatus,
    imported_qualifications: importedCount ?? 0,
    fallback_qualifications: 0,
    last_check: new Date().toISOString(),
  };
}

// ─── Rate limiting (per-IP, simple in-memory) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in 60 seconds." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result: unknown;

    switch (action) {
      case "search":
        result = await handleSearch(params as SearchParams);
        break;
      case "suggestions":
        result = await handleSuggestions(params as SuggestionsParams);
        break;
      case "facets":
        result = await handleFacets(params as FacetsParams);
        break;
      case "qualification":
        result = await handleQualification(params as { code: string });
        break;
      case "organisation":
        result = await handleOrganisation(params as OrganisationParams);
        break;
      case "import":
        result = await handleImport(params as ImportParams);
        break;
      case "sync":
        result = await handleSync(params as SyncParams);
        break;
      case "status":
        result = await handleStatus(params as { tenant_id?: string });
        break;
      default:
        return new Response(
          JSON.stringify({
            error: `Unknown action: ${action}. Valid actions: search, suggestions, facets, qualification, organisation, import, sync, status`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("tga-search error:", err);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
