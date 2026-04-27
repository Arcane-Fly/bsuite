# @bsuite/dry-lint

ESLint flat-config plugin that enforces the BSuite **one-shot architecture** — every Supabase entity table has a single canonical owner app, and other apps may READ but never WRITE to it.

The plugin currently ships one rule:

| Rule | Purpose |
|------|---------|
| `bsuite/no-cross-app-write` | Errors when an app calls `.from('<table>').{insert,update,upsert,delete}()` against a table owned by a different app per the ownership map. |

The ownership map lives at [`src/ownership-map.json`](./src/ownership-map.json) and is sourced from `docs/20260227-dry-one-shot-architecture-v1.01A.md §1` plus the V5–V10 findings in `docs/20260423-cross-app-write-audit-v1.00W.md`.

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

The rule needs to know which app a file belongs to so it can compare against the ownership map. Detection walks the file's absolute path looking for the first directory segment matching one of:

| Segment | App key |
|---------|---------|
| `business-suite-unified`, `bsu` | `bsu` |
| `crm7` | `crm7` |
| `conduit` | `conduit` |
| `braden` | `braden` |
| `R80.3`, `r80`, `r8` | `r80` |
| `throughput` | `throughput` |

If no segment matches (e.g. when linting `packages/theme/src/`), the rule no-ops on that file.

You can override detection per-config-block via the `appOverride` option.

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

## Known violations (PHASE 2 fix targets)

Per `docs/20260423-cross-app-write-audit-v1.00W.md` V5–V10, the rule will (intentionally) fire on these existing sites until WS-I PHASE 2 lands:

- BSU `src/pages/Embed/LeadForm.tsx:109` — `.from('leads').insert()` (P1-1)
- BSU `src/lib/ideaService.ts:60` — `.from('ideas').update()` (P1-2)
- Throughput `src/lib/teamPermissions.ts:302` — `.from('team_members').update()` (P1-6)

Until they are fixed, consumer ESLint configs should wire the rule as `warn`, not `error`.

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
