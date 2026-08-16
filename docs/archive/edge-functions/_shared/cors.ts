/**
 * ARCHIVED 2026-08-16 alongside get-fairwork-api-key and auth-fairwork.
 *
 * Both archived functions import this module. It is preserved so either bundle
 * could be redeployed byte-faithfully if a caller is ever discovered — the
 * archive notes in both index.ts files promise it is here, and an archive that
 * references a file it does not contain is not a recovery path.
 *
 * NOTE: this is the R80.3 copy (the retired repo). Living copies of the same
 * helper exist in the active submodules and have since diverged; do not treat
 * this file as current, and do not import it from anything.
 */

export const ALLOWED_ORIGINS = [
  "https://r8.crm7.app",
  "https://r80.app",
  "https://r80-3.vercel.app",
  "https://crm.crm7.app",
  "https://suite.crm7.app",
  "https://conduit.crm7.app",
  "https://ideas.crm7.app",
  "https://crm7.app",
  "https://www.crm7.app",
  "https://braden.com.au",
  "https://www.braden.com.au",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const VERCEL_PREVIEW_RE =
  /^https:\/\/[\w.-]+-(?:braden-pty-ltd|braden-pty-ltds-projects|garyocean428s-projects)\.vercel\.app$/;

const APP_BRANCH_RE =
  /^https:\/\/[a-z0-9-]+\.(?:suite|crm|conduit|r8|ideas)\.crm7\.app$/;

export function isAllowedOrigin(origin: string): boolean {
  return (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    VERCEL_PREVIEW_RE.test(origin) ||
    APP_BRANCH_RE.test(origin) ||
    ALLOWED_ORIGINS.includes(origin)
  );
}

export function getCorsHeaders(
  req: Request,
  opts?: { methods?: string; extraHeaders?: string },
): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = isAllowedOrigin(origin);
  const baseHeaders = "authorization, x-client-info, apikey, content-type";
  const headers = opts?.extraHeaders ? `${baseHeaders}, ${opts.extraHeaders}` : baseHeaders;
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": headers,
    "Access-Control-Allow-Methods": opts?.methods ?? "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
