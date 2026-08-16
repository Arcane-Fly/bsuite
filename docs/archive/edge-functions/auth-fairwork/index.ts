/**
 * ARCHIVED 2026-08-16 — DELETED FROM PRODUCTION. DO NOT REDEPLOY.
 *
 * slug:              auth-fairwork
 * version at delete: 41 (ACTIVE)
 * ezbr_sha256:       f4388d35003349559be62d603f4edcb4dbbf2bc2fbbc1277b3497a2a0b3c32d1
 * entrypoint:        R80.3/supabase/functions/auth-fairwork/index.ts  (retired repo)
 * verify_jwt:        true
 * callers:           ZERO — grepped across all six repos plus workflows/JSON
 *
 * WHY IT WAS DELETED — register P0-8a, sibling of get-fairwork-api-key.
 *
 * This one does not hand the Fair Work Commission key to the caller. It is worse
 * in a subtler way: it SPENDS the key on the caller's behalf, gated only on "is
 * logged in". It decodes the JWT purely to assert `payload.sub` exists, then
 * discards it — no role check, no tenant check — and proxies the request to
 * https://api.fwc.gov.au/api/v1 with `Ocp-Apim-Subscription-Key: <the paid key>`.
 *
 * And the proxied path is caller-controlled:
 *
 *     const endpoint = url.searchParams.get('endpoint');
 *     const apiUrl = `${API_BASE_URL}${endpoint}`;
 *
 * `endpoint` is concatenated with no allowlist and no traversal check, so any
 * authenticated user of any of the seven tenants could drive arbitrary paths on
 * the paid subscription — quota exhaustion at minimum, and reachability of any
 * FWC surface the subscription covers.
 *
 * Deleted rather than gated because it has zero callers and the supported path
 * already exists: crm7 `fairwork-*` and BSU `fairwork-enhanced` read the secret
 * server-side at invocation and never expose it or the proxy to a browser.
 *
 * ROTATION still required at the FWC console — see the note in the sibling
 * archive. Deleting stops new spend; it does not invalidate a key already taken.
 *
 * Recovery: this file is the exact deployed bundle. Redeploy also needs
 * `_shared/cors.ts`, archived alongside.
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";

// API Configuration for Fair Work Commission
const API_BASE_URL = 'https://api.fwc.gov.au/api/v1';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req), status: 204 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }
    const token = authHeader.split(' ')[1];

    try {
      const b64 = token.split('.')[1];
      const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('no sub');
    } catch {
      throw new Error('Authentication error: invalid token');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const year = url.searchParams.get('year');
    if (!endpoint) throw new Error('Missing endpoint parameter');

    let apiKey = Deno.env.get("FAIRWORK_API_KEY");
    if (!apiKey) {
      const { data: apiKeyData, error: apiKeyError } = await supabaseClient
        .from("api_keys").select("key_value").eq("key_name", "FAIRWORK_API_KEY").single();
      if (apiKeyError || !apiKeyData) throw new Error('API key not available from any source');
      apiKey = apiKeyData.key_value;
    }

    let apiEndpoint = endpoint;
    if (year && !endpoint.includes('year=')) {
      apiEndpoint += endpoint.includes('?') ? `&year=${year}` : `?year=${year}`;
    }
    const apiUrl = `${API_BASE_URL}${apiEndpoint}`;

    const requestHeaders = { 'Ocp-Apim-Subscription-Key': apiKey, 'Accept': 'application/json' };
    const response = await fetch(apiUrl, { headers: requestHeaders, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    const data = await response.json();
    return new Response(JSON.stringify({ data, year: year || 'current' }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Failed to fetch data from Fair Work API",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      documentation: "/docs/fairwork-api.md"
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
