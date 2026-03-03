/**
 * tga-search — Supabase Edge Function
 *
 * Proxies Training.gov.au (TGA) API for qualification search, detail lookup,
 * and import into the local Supabase database.
 *
 * Actions:
 *   search       — Search qualifications by query string
 *   qualification — Get qualification detail by code (with units)
 *   import       — Import a qualification + units into the DB
 *   sync         — Batch import by keyword list
 *   status       — Health check / stats
 *
 * Environment secrets (set via Supabase dashboard):
 *   TGA_USERNAME  — TGA API basic-auth username  (default: WebService.Read)
 *   TGA_PASSWORD  — TGA API basic-auth password  (default: Asdf098)
 *
 * The function uses the TGA REST API (https://training.gov.au/api) as the
 * primary data source. SOAP is not used because Deno has no native SOAP client.
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

// ─── TGA REST API helpers ─────────────────────────────────────────────────────

interface TGASearchItem {
  Code?: string;
  Title?: string;
  Status?: string;
  TrainingComponentTypeCode?: string;
  NrtFlag?: boolean;
  // Nested fields from detail endpoint
  TrainingPackage?: { Code?: string; Title?: string };
  AQFLevel?: { Code?: string; Level?: number; Title?: string };
  ReleaseDate?: string;
}

interface TGASearchResponse {
  Results?: TGASearchItem[];
  Count?: number;
}

interface TGADetailResponse {
  Code?: string;
  Title?: string;
  Description?: string;
  Status?: string;
  NrtFlag?: boolean;
  ReleaseDate?: string;
  TrainingPackage?: { Code?: string; Title?: string };
  AQFLevel?: { Code?: string; Level?: number; Title?: string };
  UnitGrid?: Array<{
    Code?: string;
    Title?: string;
    IsEssential?: boolean;
    GroupTitle?: string;
  }>;
  Releases?: Array<{
    ReleaseNumber?: number;
    ReleaseDate?: string;
  }>;
}

async function tgaFetch(path: string): Promise<Response> {
  const url = `${TGA_API_BASE}${path}`;
  const username = Deno.env.get("TGA_USERNAME") ?? "WebService.Read";
  const password = Deno.env.get("TGA_PASSWORD") ?? "Asdf098";
  const auth = btoa(`${username}:${password}`);

  const resp = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `TGA API ${resp.status}: ${resp.statusText} — ${body.slice(0, 200)}`
    );
  }

  return resp;
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
  const cached = getCached<ReturnType<typeof mapSearchResults>>(cacheKey);
  if (cached) return cached;

  const qs = new URLSearchParams({
    searchQuery: query,
    pageSize: String(limit),
    includeSuperseded: String(includeSuperseded),
    includeDeleted: "false",
    sortOrder: "relevance",
  });

  const resp = await tgaFetch(`/search?${qs}`);
  const data: TGASearchResponse = await resp.json();

  const result = mapSearchResults(data);
  setCache(cacheKey, result);
  return result;
}

function mapSearchResults(data: TGASearchResponse) {
  const items = (data.Results ?? [])
    .filter(
      (item) =>
        item.TrainingComponentTypeCode === "Qual" ||
        item.TrainingComponentTypeCode === "AccreditedQualification"
    )
    .map((item) => ({
      code: item.Code ?? "",
      title: item.Title ?? "",
      level: item.AQFLevel?.Level ?? 0,
      status: item.Status ?? "Unknown",
      releaseDate: item.ReleaseDate ?? "",
      trainingPackage: item.TrainingPackage
        ? {
            code: item.TrainingPackage.Code ?? "",
            title: item.TrainingPackage.Title ?? "",
          }
        : undefined,
      nrtFlag: item.NrtFlag ?? false,
    }));

  return {
    results: items,
    count: items.length,
    source: "training.gov.au",
  };
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
  // Fetch the qualification detail with unit grid
  const resp = await tgaFetch(
    `/qualification/${encodeURIComponent(code)}?showUnitGrid=true`
  );
  const data: TGADetailResponse = await resp.json();

  const coreUnits: Array<{ code: string; title: string; isCore: boolean }> = [];
  const electiveUnits: Array<{
    code: string;
    title: string;
    isCore: boolean;
  }> = [];

  for (const unit of data.UnitGrid ?? []) {
    const mapped = {
      code: unit.Code ?? "",
      title: unit.Title ?? "",
      isCore: unit.IsEssential ?? false,
    };
    if (mapped.isCore) {
      coreUnits.push(mapped);
    } else {
      electiveUnits.push(mapped);
    }
  }

  return {
    code: data.Code ?? code,
    title: data.Title ?? "",
    description: data.Description ?? "",
    level: data.AQFLevel?.Level ?? 0,
    status: data.Status ?? "Unknown",
    releaseDate: data.ReleaseDate ?? "",
    trainingPackage: data.TrainingPackage
      ? {
          code: data.TrainingPackage.Code ?? "",
          title: data.TrainingPackage.Title ?? "",
        }
      : undefined,
    nrtFlag: data.NrtFlag ?? false,
    unitsOfCompetency: {
      core: coreUnits,
      elective: electiveUnits,
    },
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
      ...qual.unitsOfCompetency.core.map((u) => ({
        code: u.code,
        title: u.title,
        isCore: true,
      })),
      ...qual.unitsOfCompetency.elective.map((u) => ({
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

  // Check TGA API health
  let tgaStatus = "unknown";
  try {
    const resp = await tgaFetch("/search?searchQuery=test&pageSize=1");
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
      case "qualification":
        result = await handleQualification(params as { code: string });
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
            error: `Unknown action: ${action}. Valid actions: search, qualification, import, sync, status`,
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
