# @bsuite/nav-core

App-agnostic navigation primitives for the BSuite apps: the sidebar state,
the app switcher, the filtered nav, Speed Insights route naming — and, from
1.3.0, the platform update notice and the unsaved-work guard.

Ships as an npm package because Vercel deploys each BSuite app from its own
GitHub repo — the parent monorepo's `packages/` directory does NOT exist in the
Vercel build context. Consumers install from npm with a semver range.

## Update notice and unsaved-work guard (v1.3.0+)

**Operator directive 2026-09-03 10:48:** "note there are people using the app
in production i.e. actual clients so stage all work to development branch and
then ensure their is a platform notice and refresh to update prompt so they
dont lose work on rebuilds."

Four exports, one contract: **a rebuild announces itself; nothing reloads a
client's tab without their consent** (precedent
`precedent__bsuite__20260903__no_code_path_reloads_a_clients_tab_without_consent`).

| Export | Entry point | What it does |
|---|---|---|
| `useAppUpdateAvailable()` | `@bsuite/nav-core` | Compares the commit baked into the RUNNING bundle (`__BUILD_COMMIT__`) with the commit at `/version.json`. Any difference is `versionChanged`. Never reloads. |
| `<UpdateAvailableBanner/>` | `@bsuite/nav-core` | `role="status" aria-live="polite"`, role tokens only, one Refresh button (confirms when a form is dirty), Dismiss (hidden when `severity: 'critical'`). `data-slot="update-available-banner"` for the mount gate. |
| `useUnsavedChanges()` / `useRegisterDirty()` | `@bsuite/nav-core` | A module-level dirty registry that arms ONE `beforeunload` while anything is dirty, plus `confirmLeave()` for the banner's Refresh. |
| `versionJsonPlugin()` / `writeVersionJson()` | `@bsuite/nav-core/vite` | The BUILD half: defines `__BUILD_COMMIT__` and emits `dist/version.json` from ONE resolver. **Node-only — never import it from browser code.** |

### How detection works

- The plugin resolves the commit ONCE per build: `VERCEL_GIT_COMMIT_SHA`, then
  `GIT_COMMIT`, then `git rev-parse HEAD`. With none of the three it **throws**
  — a build that cannot identify itself cannot tell a client their tab is out
  of date, and a placeholder such as `'local'` makes the check permanently
  silent while every gate stays green. Pass
  `allowUnknownCommit: mode !== 'production'` for local dev, where the plugin
  then defines nothing, emits nothing, and the hook reports
  `updateCheckBroken: 'no-build-commit'` and does nothing.
- The comparison is **exact**: both halves come from the same resolver at the
  same `commitLength`, so a length mismatch means an app kept a hand-rolled
  `define.__BUILD_COMMIT__` beside the plugin. Remove the hand-rolled one.
- Any difference is a change. The copy never says "new": Vercel's Instant
  Rollback moves the deployed commit *backwards*, and a tab on the
  rolled-back-from build is just as out of date.
- Polling: on mount, every 10 minutes (`intervalMs`), and on every
  `visibilitychange` to visible. `fetch(url, { cache: 'no-store' })`.
- A broken check is **loud, never silent**: the `content-type` is asserted to
  start with `application/json` BEFORE the body is parsed. A mismatch logs one
  `console.error` (per distinct fault, not per poll), sets `updateCheckBroken`
  (`'not-json' | 'bad-status' | 'malformed' | 'unreachable' | 'no-build-commit'`)
  and keeps polling. Today a missing `/version.json` answers `200 text/html`
  on every Vite app in this estate (the SPA catch-all rewrite) — that is the
  failure this assertion exists to surface.
- Dismissal is keyed by the **detected** commit in `sessionStorage`
  (`bsuite:update-dismissed:<commit>`), so a later deploy re-shows the notice
  and a fresh tab starts undismissed. An escalation (a chunk failing to load) clears
  the dismissal for the current commit.
- Control (`{ enabled, severity }`) is read by the app from its existing
  system-notice source (slug `update-notice`) and passed straight through.
  `enabled: false` is the kill switch — no banner, no polling, no deploy
  needed. `severity: 'critical'` cannot be dismissed and re-shows on every
  poll.

### Adoption snippet (Vite apps)

```ts
// vite.config.ts
import { versionJsonPlugin } from '@bsuite/nav-core/vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    versionJsonPlugin({ allowUnknownCommit: mode !== 'production' }),
  ],
  // REMOVE any hand-rolled `define: { __BUILD_COMMIT__: ... }` — the plugin owns it.
}))
```

```tsx
// the app shell — wherever the SystemNoticeBanner already sits
import { UpdateAvailableBanner } from '@bsuite/nav-core'

<AppShell
  banner={
    <>
      <SystemNoticeBanner />
      <UpdateAvailableBanner
        control={updateNotice /* { enabled, severity } from system_notices slug 'update-notice' */}
        onRefresh={purgeStaleAppCachesThenReload /* crm7 only; others omit -> location.reload() */}
        update={{
          runningCommit: __BUILD_COMMIT__, // belt-and-braces: the app's own define site
          onSignal: (raise) => {           // immediate triggers the app already has
            const onPreload = () => raise('vite:preloadError')
            window.addEventListener('vite:preloadError', onPreload)
            return () => window.removeEventListener('vite:preloadError', onPreload)
          },
        }}
      />
    </>
  }
/>
```

```tsx
// any form with real work in it
import { useRegisterDirty } from '@bsuite/nav-core'

useRegisterDirty(`apprentice-edit:${id}`, form.formState.isDirty)
```

For a Next.js app (conduit) there is no `generateBundle`; serve the same shape
from a route handler and share the writer so the two shapes cannot drift:

```ts
// src/app/version.json/route.ts
import { resolveBuildInfo } from '@bsuite/nav-core/vite'  // server-only file
export const dynamic = 'force-static'                     // resolved once, at build
const info = resolveBuildInfo({ commitLength: 'short' })
if (!info) throw new Error('version.json: no build commit resolved (VERCEL_GIT_COMMIT_SHA / GIT_COMMIT / git)')
export function GET() {
  return Response.json(info, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  })
}
```

### The rewrite exclusion (every Vite app's `vercel.json`)

A missing `/version.json` must **404 honestly**, not answer the SPA index page.
Add `version\.json` to the rewrite's negative-lookahead (crm7 / R80.4 shape), or
an explicit exclusion in the catch-all shape (BSU / braden / throughput):

```jsonc
// negative-lookahead shape (crm7, R80.4)
{ "source": "/((?!api/|assets/|version\\.json|...).*)", "destination": "/index.html" }

// catch-all shape (business-suite-unified, braden, throughput)
{ "source": "/((?!version\\.json).*)", "destination": "/index.html" }
```

### The Cache-Control rule

`/version.json` must never be served from a CDN or browser cache — a cached
answer is the OLD build's answer, and the check silently agrees with the tab it
is meant to correct. Every app's `vercel.json` already carries this for
`/index.html`; add the same for `/version.json`, and make sure it does NOT
fall under an `/assets/*` immutable rule:

```json
{
  "source": "/version.json",
  "headers": [
    { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
  ]
}
```

(conduit: the same via `next.config.ts` `headers()` or the route handler's
response headers, and `/version.json` added to `publicMetadataPaths` in
`src/lib/supabase/middleware.ts` so it is not redirected to login.)

### The smoke check

Before trusting the banner on any domain, check what `/version.json` actually
returns there. Anything but `200` + `application/json` means the notice is
wired to nothing:

```bash
for d in suite crm conduit ideas r8 d.suite d.crm d.conduit d.ideas d.r8; do
  printf '%-12s ' "$d"
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "https://$d.crm7.app/version.json"
done
# braden.com.au and d.braden.com.au likewise
```

The parent repo's `scripts/check-version-json-served.mjs` runs this over all
12 domains post-deploy and nightly. Also: open a tab, deploy a different
commit, and confirm the banner appears within one poll **without** the tab
reloading (a `window.__sentinel = Date.now()` set in the console must survive).

### What this package does NOT do

- It never reloads. The only reload is the banner's Refresh button, after
  `confirmLeave()`.
- It does not touch a service worker. crm7's `VitePWA` config stays as it is;
  crm7 passes `purgeStaleAppCachesThenReload` as `onRefresh`.
- It does not remove the existing unconsented reload sites in the apps
  (BSU `ErrorBoundary.tsx:59`, crm7 `App.tsx:1146-1151` and `:1155`,
  throughput `ErrorBoundary.tsx:73`). Each app's adoption PR deletes those and
  routes the signal into `onSignal` instead.

## Other exports

`useSidebarState`, `useFilteredNav`, `useSpeedInsightsRoute` /
`speedInsightsRoute`, `AppSwitcher`, `MobileSidebarDrawer`, `launchUrl`,
`sanitizeReturnPath`, `cookieStorage`, `merge`, and the sidebar token CSS at
`@bsuite/nav-core/tokens/d2c-sidebar.css` and `.../corporate-sidebar.css`. See
`src/index.ts` for the full surface and each file's docblock for its contract.

## Releases

See `CONTRIBUTING.md`. Merging a `package.json` version bump to `main` runs
`.github/workflows/publish-nav-core.yml` (npm Trusted Publishers, OIDC).

**NEVER** use `workspace:*` or `file:../packages/nav-core` in a consumer —
Vercel builds cannot resolve those.
