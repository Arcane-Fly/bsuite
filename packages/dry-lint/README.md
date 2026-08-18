# @bsuite/dry-lint

ESLint flat-config plugin that enforces the BSuite **one-shot architecture** — every Supabase entity table has a single canonical owner app, and other apps may READ but never WRITE to it.

The plugin ships four rules:

| Rule | Default | Purpose |
|------|---------|---------|
| `bsuite/no-cross-app-write` | `error` | Errors when an app calls `.from('<table>').{insert,update,upsert,delete}()` against a table owned by a different app per the ownership map. |
| `bsuite/no-raw-entity-select` | `warn` | Flags raw `.select()` reads against canonical entity tables — encourages going through the typed entity-service layer. |
| `bsuite/no-uuid-input-placeholder` | `error` | Flags `<Input placeholder="UUID of …">` and similar UUID-prompting placeholders on `<Input>`/`<input>`/`<Textarea>`/`<textarea>`. Operators must pick from a canonical entity selector, not paste a UUID by hand. |
| `bsuite/oauth-callback-must-bridge` | `error` | Errors when a file calls `exchangeCodeForTokens()` without a corresponding `supabase.auth.setSession()` bridge — prevents the BSU→app handoff from leaving the user anonymous. |

The ownership map lives at [`src/ownership-map.json`](./src/ownership-map.json) and is sourced from `docs/20260227-dry-one-shot-architecture-v1.04A.md §1` plus the V5–V10 findings in `docs/20260423-cross-app-write-audit-v1.00W.md`.

## `bsuite/no-uuid-input-placeholder`

Forces operators to use canonical entity selectors instead of free-text UUID inputs. Triggered after the 2026-06-01 sweep (PRs #933–#939) which replaced raw UUID inputs across 16 CRM7 pages.

### Detected pattern

```tsx
// ❌ flagged — operator should pick, not paste
<Input placeholder="UUID of host employer" />
<Input placeholder="Enter apprentice UUID" />
<Input placeholder="Apprentice UUID" />
```

### Canonical fix

```tsx
// ✅ pick from a canonical entity selector
import { EmployerSelector } from '@/components/entity/selectors';

<EmployerSelector
  value={hostEmployerId}
  onSelect={(entity) => setHostEmployerId(entity?.id ?? '')}
/>
```

If no selector exists, build one mirroring the `IncidentSelector` I4 pattern (tenant-scoped via explicit `.eq('tenant_id', …)` on top of RLS).

### Allowed escapes

- Test, spec, stories, and `__mocks__` paths are skipped automatically.
- Inline `// eslint-disable-next-line bsuite/no-uuid-input-placeholder` for genuinely-no-canonical-entity surfaces (developer-only debug tools). Document why with a comment.

---

## Install

```bash
pnpm add -D @bsuite/dry-lint
```

The plugin is ESLint v9 flat-config compatible. It declares `eslint >=9` as a peer dependency.

---

## Usage

### Recommended — one-line wire-up

```ts
// eslint.config.ts
import bsuiteDryLint from '@bsuite/dry-lint';

export default [
  bsuiteDryLint.configs.recommended, // bsuite/no-cross-app-write: error
  // ...rest of your config
];
```

### Warn-only (useful during phased rollout)

```ts
import bsuiteDryLint from '@bsuite/dry-lint';

export default [
  bsuiteDryLint.configs.warn, // bsuite/no-cross-app-write: warn
];
```

### Manual wiring with options

```ts
import bsuiteDryLint from '@bsuite/dry-lint';

export default [
  {
    plugins: { bsuite: bsuiteDryLint },
    rules: {
      'bsuite/no-cross-app-write': [
        'error',
        {
          // Override the auto-detected app (default: inferred from file path)
          appOverride: 'crm7',
          // Also report writes to tables not in the ownership map (default: false)
          warnOnUnknownTable: true,
        },
      ],
    },
  },
];
```

---

## How app detection works

The rule needs to know which app a file belongs to so it can compare against the ownership map. **Every real app config passes an explicit `appOverride`** (see the "Configuration" examples above — each app's `eslint.config.js` sets `{ appOverride: '<app>' }`), so in practice `appOverride` is what actually determines the app in production; the automatic detector below only runs when `appOverride` is omitted.

Detection (`detectAppFromPath()`, `src/app-detection.ts`) walks up from the linted **file's own directory** looking for the nearest `package.json`, bounded at the first `.git` marker (file or directory — covers git-worktree checkouts, where `.git` is a file pointing at the real gitdir). The `package.json` `name` field is matched against:

| `package.json` `name` | App key |
|---|---|
| `business-suite-unified` | `bsu` |
| `crm7-complete`, `crm7` | `crm7` |
| `conduit` | `conduit` |
| `braden-app` | `braden` |
| `r80-calculator`, `r80.3` | `r80` |
| `throughput` | `throughput` |
| any `@bsuite/*` scoped package | `shared` |

If no `package.json` is found before the `.git` boundary, or its `name` doesn't match, the rule no-ops on that file (fail closed — a missed detection is always safe; a false attribution is not).

**bsuite#1623:** an earlier version of this detector matched path SEGMENTS instead (e.g. treating any `crm7` directory-name segment as the CRM7 app). That broke for the platform's standard `git worktree add /home/<user>/Desktop/Dev/<app>-<feature>-worktree` convention — a worktree checked out as a SIBLING of `bsuite/` with a directory name that doesn't literally equal the app name — and misattributed such files to whichever known app name happened to appear anywhere in the path (including a contributor's own home directory). The `package.json`-based walk above is immune to checkout directory naming entirely.

You can override detection per-config-block via the `appOverride` option — and every shipped app config does.

---

## How write detection works

The rule walks the AST for any call expression where the callee is a member access ending in one of `insert`, `update`, `upsert`, or `delete`. It then walks back along the query-builder chain until it finds the closest `.from('<literal>')` call and resolves the table name.

The chain walk handles:

- Direct calls — `supabase.from('x').insert(...)`
- Chained query-builder calls — `supabase.from('x').select('*').eq('id', 1).update(...)`
- `await`-wrapped calls
- Calls preceded by any number of intermediate `.from()`-irrelevant query methods

It does NOT report:

- Reads (`.select(...)`)
- Calls where the table name is a non-literal expression (e.g. a variable). This is intentional — we'd rather miss a few cases than spam false positives.
- Calls in files outside any known app.

---

## Adding a new table to the ownership map

Each entry uses **EXACTLY ONE** of `owner` (single canonical write surface) or `writers` (multi-writer admin co-ownership, `@bsuite/dry-lint@0.2.0`+). Setting both is a schema error.

### Single-owner entry (most common)

1. Open [`src/ownership-map.json`](./src/ownership-map.json).
2. Add an entry under `tables`:

   ```jsonc
   {
     "tables": {
       "your_new_table": {
         "owner": "crm7",        // one of: bsu, crm7, conduit, braden, r80, throughput, shared, all
         "readers": ["bsu"],     // apps that may .select() but never write
         "$comment": "Optional context, e.g. audit reference."
       }
     }
   }
   ```

3. Use `"shared"` if the table is co-owned by 2+ apps with a documented audit-trail / append-only pattern (e.g. `wage_calculation_snapshots`).
4. Use `"all"` for explicit event-sink tables (e.g. `bi_metrics`).

### Multi-writer entry (PHASE-3c, v0.2.0+)

For admin-CRUD tables co-owned by an explicit allow-list of apps (e.g. `tenants` + `user_tenants`, where BSU is the platform owner and CRM7's tenant-management edge function performs legitimate org-admin operations under RLS):

```jsonc
{
  "tables": {
    "your_co_owned_table": {
      "writers": ["bsu", "crm7"],   // explicit allow-list — at least one app
      "readers": ["r80", "conduit"], // apps that may .select() only
      "$comment": "Why this is multi-writer rather than single-owner."
    }
  }
}
```

The rule will pass writes from any listed app and flag writes from non-listed apps with a `crossAppWriteMultiWriter` message.

### Versioning

Bump the `@bsuite/dry-lint` version (patch for new tables, minor for owner moves or schema additions) and republish.

---

## Owner keys

| Key | App | Repo |
|-----|-----|------|
| `bsu` | business-suite-unified | `business-suite-unified/` |
| `crm7` | CRM7 | `crm7/` |
| `conduit` | Conduit (recruitment ATS) | `conduit/` |
| `braden` | braden.com.au corporate site | `braden/` |
| `r80` | R80.3 wage calculator | `R80.3/` |
| `throughput` | Throughput (idea management) | `throughput/` |
| `shared` | Co-owned by multiple apps (audit-trail / append-only) | n/a |
| `all` | Event sink — any app may write | n/a |

---

## Known violations and enforcement posture

Consumer apps should wire `bsuite/no-cross-app-write` as `error`. Pre-existing
legacy write paths must be isolated with narrow per-file overrides in the
consumer ESLint config; do not keep the base rule in warn-mode.

The 2026-04-27 Phase 2D promotion moved BSU, CRM7, Conduit, R80.3, Braden, and
Throughput to error-level enforcement while preserving documented exception
sets for the Phase 5 ownership-relocation work.

Run the dry-run helper after ownership-map edits to identify any exception list
that can be removed:

```bash
pnpm --filter @bsuite/dry-lint build
node packages/dry-lint/scripts/dry-run.mjs
```

---

## Development

```bash
# Install (use --ignore-workspace until package is added to pnpm-workspace.yaml)
cd packages/dry-lint && pnpm install --ignore-workspace

# Build
pnpm build

# Run tests
pnpm test
```
