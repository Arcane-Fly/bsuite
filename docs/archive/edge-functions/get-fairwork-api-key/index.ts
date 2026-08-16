/**
 * ARCHIVED 2026-08-16 — DELETED FROM PRODUCTION. DO NOT REDEPLOY.
 *
 * slug:            get-fairwork-api-key
 * version at delete: 41 (ACTIVE)
 * ezbr_sha256:     4108ea19e8e630cfd4722eb4eebd173b734ba6f75c4ee2e24057959a7e333a60
 * entrypoint:      R80.3/supabase/functions/get-fairwork-api-key/index.ts  (retired repo)
 * verify_jwt:      true
 * callers:         ZERO — grepped across all six repos plus workflows/JSON
 *
 * WHY IT WAS DELETED RATHER THAN FIXED — register P0-8a.
 *
 * This endpoint's PURPOSE is the defect: it is a secret dispenser. It hands the
 * paid Fair Work Commission API subscription key to its caller. `verify_jwt: true`
 * means the caller must be logged in, and that is the ONLY gate — the handler
 * decodes `payload.sub` into `userId`, logs it, and then never uses it again. No
 * role check, no tenant check. Every authenticated user of all seven tenants
 * could retrieve the key.
 *
 * It is worse than a design flaw, because the code below never even reaches its
 * own database lookup:
 *
 *     const supabaseClient = createClient(
 *       supabaseUrl,                                   // <- NEVER DECLARED
 *       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
 *     );
 *
 * `supabaseUrl` is not declared anywhere in the module. Every invocation throws
 * ReferenceError, the outer catch fires, and the catch returns
 * `Deno.env.get("FAIRWORK_API_KEY")` — so the "fallback" path IS the only path,
 * and it serves the key unconditionally to anyone with a login.
 *
 * This is the "nothing typechecks edge functions, so undeclared names reach
 * production" class. No build step touched this file; it deployed and ran for
 * months returning 200 with a secret in the body.
 *
 * FIXING IT WAS THE WRONG MOVE. Declaring `supabaseUrl` would have repaired a
 * broken secret-dispenser into a WORKING secret-dispenser. The supported callers
 * (crm7 `fairwork-*`, BSU `fairwork-enhanced`) read the secret server-side at
 * invocation and never need it in a browser.
 *
 * ROTATION: the key must be rotated at the FWC console — anyone who called this
 * endpoint holds a copy. Deleting the function stops new disclosure; it does not
 * un-disclose.
 *
 * Recovery, if a caller is ever discovered: this file is the exact deployed
 * bundle. Redeploy needs the sibling `_shared/cors.ts`, archived alongside.
 */

import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../_shared/cors.ts";

function errorResponse(req: Request, status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests — must pass before auth check
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: getCorsHeaders(req),
      status: 204,
    });
  }

  // ── JWT user auth ─────────────────────────────────────────────────────────
  // Only authenticated (logged-in) users may retrieve the Fair Work API key.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return errorResponse(req, 401, "Unauthorized");
  }

  // Gateway verify_jwt:true validated the JWT via JWKs before this code runs.
  // Decode already-verified claims directly — no GoTrue round-trip.
  let userId: string;
  try {
    const b64 = token.split('.')[1];
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('no sub');
    userId = payload.sub;
  } catch {
    return errorResponse(req, 401, "Unauthorized");
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    console.log(`Received request for Fair Work API key from user ${userId}`);

    // Use the service-role client only after the caller is verified
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get the Fair Work API key from the database
    const { data, error } = await supabaseClient
      .from("api_keys")
      .select("key_value")
      .eq("key_name", "FAIRWORK_API_KEY")
      .single();

    if (error) {
      console.error("Database error:", error);

      // Fallback to environment variable if database access fails
      const fallbackKey = Deno.env.get("FAIRWORK_API_KEY");
      if (fallbackKey) {
        console.log("Using API key from environment variable");
        return new Response(JSON.stringify({ key: fallbackKey }), {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 200,
        });
      }

      if (error.message.includes("permission denied")) {
        console.log("Permission denied for api_keys table, using environment variable");
        const envKey = Deno.env.get("FAIRWORK_API_KEY");
        if (!envKey) {
          throw new Error("No API key available in environment variables after permission denied");
        }

        return new Response(JSON.stringify({ key: envKey }), {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 200,
        });
      }

      throw error;
    }

    if (!data || !data.key_value) {
      // Try using environment variable as fallback
      const envKey = Deno.env.get("FAIRWORK_API_KEY");
      if (!envKey) {
        throw new Error("API key not found in database or environment variables");
      }

      console.log("API key not found in database, using environment variable");
      return new Response(JSON.stringify({ key: envKey }), {
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }

    console.log("API key retrieved successfully");

    // Return the API key with appropriate headers
    return new Response(JSON.stringify({ key: data.key_value }), {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching Fair Work API key:", error);

    // Return a fallback key from environment variable
    const fallbackKey = Deno.env.get("FAIRWORK_API_KEY");
    if (fallbackKey) {
      console.log("Error occurred but using fallback key from environment");
      return new Response(JSON.stringify({ key: fallbackKey }), {
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      error: "Failed to fetch API key",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
