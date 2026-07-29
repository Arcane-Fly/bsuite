# Next-5 Recurring Bugs Close-Out Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> **STRICTLY BSuite — no QIG.** Branch doctrine: feature branches from `development`, merge `--no-ff`, promote via `gh pr merge --merge` (never squash, never delete-branch on promotion).

**Goal:** Permanently reduce the top five recurring / unexamined classes from `docs/20260724-recurring-bugs-and-blindspots-v1.00W.md` (items 1–5 in §4).

**Architecture:** Five independent workstreams, one mutation lane per repo where possible. Parallel across repos; serial within a repo. No product scope beyond these five.

**Tech Stack:** crm7 (Vite/React/Vitest/Playwright), packages/dates + packages/ui (parent monorepo), BSuite gitleaks, supabase migrations doctrine, GitHub Actions.

**Source catalogue:** `docs/20260724-recurring-bugs-and-blindspots-v1.00W.md`  
**Do NOT re-open:** docs program, STA email, email/funding expansion, bug-hunt 48, one-shot audit closes.

---

## Workstream map

| WS | Class | Primary repo | Branch |
|----|-------|--------------|--------|
| A | Reports empty-params (#1161–1163) | crm7 | `fix/reports-empty-params-null` |
| B | LocalisedDateInput shared (#1610) | parent packages/dates + apps | `fix/localised-date-input-shared` (parent) then app consumers |
| C | Gitleaks allowlist (#570) | business-suite-unified + parent | `fix/gitleaks-allowlist` |
| D | FK-index migration template (R1) | parent docs + crm7 migration lint | `fix/fk-index-migration-gate` |
| E | WCAG e2e real-route harden + free-text CI | crm7 | `fix/wcag-e2e-freetext-ci` (can share crm7 with A if sequential) |

**Dispatch order:** A ∥ C ∥ D first (independent repos); then B (packages publish gate); then E (crm7 after A merges to avoid same-repo contention). If Claude weekly limit hits, use glm-5.2:cloud / direct execution.

---

### Task 1: WS-A — Strip empty report params (crm7#1161)

**Objective:** Optional report filter fields must emit `null`/omitted keys, never `''` or `[]`, so PostgREST templates stop returning "No results".

**Files:**
- Modify: `crm7/src/components/reports/SchemaDrivenFilterForm.tsx` (`defaultValueForType`, `seedValuesFromSchema`, `handleApply`, `updateField`/`onChange` payload)
- Create/Modify: `crm7/src/components/reports/SchemaDrivenFilterForm.test.tsx` (or co-located test)
- Reference: crm7#1161 body — `updateField` spreads untouched optional seeds

**Step 1: Write failing tests**

```ts
// SchemaDrivenFilterForm.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchemaDrivenFilterForm } from './SchemaDrivenFilterForm'

const schema = [
  { key: 'start_date', label: 'Start', type: 'date' as const, required: false },
  { key: 'worker_ids', label: 'Workers', type: 'multi:person' as const, required: false },
  { key: 'status', label: 'Status', type: 'select' as const, required: true, options: ['open', 'closed'] },
]

it('onApply omits empty optional string/date and empty multi arrays (never sends "" or [])', async () => {
  const onApply = vi.fn()
  const user = userEvent.setup()
  render(
    <SchemaDrivenFilterForm
      paramSchema={schema}
      onChange={() => {}}
      onApply={onApply}
    />,
  )
  // set required only
  // ... select status=open via UI or fire handleApply after setting values
  await user.click(screen.getByRole('button', { name: /apply|run|generate/i }))
  const payload = onApply.mock.calls[0][0]
  expect(payload).not.toHaveProperty('start_date', '')
  expect(payload.start_date == null || payload.start_date === undefined).toBe(true)
  expect(Array.isArray(payload.worker_ids) ? payload.worker_ids.length : true).toBeTruthy()
  // worker_ids should be absent or null, not []
  expect(payload.worker_ids === undefined || payload.worker_ids === null).toBe(true)
  expect(payload.status).toBe('open')
})

it('required empty string still blocks apply', async () => {
  const onApply = vi.fn()
  render(<SchemaDrivenFilterForm paramSchema={schema} onChange={() => {}} onApply={onApply} />)
  // click apply without status
  expect(onApply).not.toHaveBeenCalled()
})
```

**Step 2: Run tests — expect FAIL**

```bash
cd crm7 && npx vitest run src/components/reports/SchemaDrivenFilterForm.test.tsx
```

**Step 3: Implement**

Add pure helper in same file (or `reportParams.ts`):

```ts
/** Strip empty optional seeds so PostgREST gets NULL not '' / []. */
export function sanitizeReportParams(
  values: Record<string, unknown>,
  paramSchema: ReportParamSchema[] | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of paramSchema ?? []) {
    const v = values[field.key]
    if (v === '' || v === undefined) {
      if (field.required) out[field.key] = v // keep for validation
      // optional: omit
      continue
    }
    if (Array.isArray(v) && v.length === 0) {
      if (field.required) out[field.key] = v
      continue
    }
    out[field.key] = v
  }
  // include any extra keys if needed
  return out
}
```

- Call `sanitizeReportParams` inside `handleApply` before `onApply?.(sanitized)`.
- Call sanitize in `updateField` before `onChange(next)` **or** only on apply — prefer **both onChange and onApply** so live preview queries also stay clean (matches #1161 root cause).
- Keep required validation against pre-sanitize or sanitize-with-required-kept.
- Multi:* pickers: ensure disabled state when no options doesn't leave sticky `[]` in payload (#1162 related — if pickers disabled, omit key).

**Step 4: Tests pass + typecheck**

```bash
npx vitest run src/components/reports/SchemaDrivenFilterForm.test.tsx
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git checkout -b fix/reports-empty-params-null
git add src/components/reports/SchemaDrivenFilterForm.tsx src/components/reports/SchemaDrivenFilterForm.test.tsx
git commit -m "fix(crm7): strip empty report params to null/omit (crm7#1161)"
```

**Step 6: Gates + merge doctrine**

```bash
npx vitest run   # full suite green
# merge --no-ff to development, push, PR to main --merge
```

Close crm7#1161 with evidence; comment on #1162/#1163 if partially addressed or file follow-up if multi:* deadlock needs separate picker work.

---

### Task 2: WS-B — LocalisedDateInput into `@bsuite/dates` (#1610)

**Objective:** One canonical component; fix R80.3 DOB wipe; delete divergent app copies.

**Files:**
- Create: `packages/dates/src/LocalisedDateInput.tsx` (+ test)
- Modify: `packages/dates/src/index.ts` / `react.tsx` exports; bump `packages/dates/package.json` version (0.1.0 → 0.2.0 or 1.0.0 if breaking export)
- Modify: crm7, R80.3, conduit, BSU, braden, throughput imports → `@bsuite/dates` (or `@bsuite/dates/react`)
- Modify: `R80.3/src/utils/employeeProfile.ts:95` — stop forcing `dateOfBirth: ''` wipe of valid ISO; preserve parsed ISO or null
- Delete app-local `**/components/ui/localised-date-input.tsx` after re-export shim **or** thin re-export for one release

**Canonical source:** Start from **crm7** copy (already has ISO-on-blur fix + tests in `localised-date-input.test.tsx`). Port tests into packages/dates.

**Step 1: Failing package test** — blur with ISO `1990-05-15` must keep value (not clear).

**Step 2: Implement component in packages/dates** using existing `parseIsoDate` (already returns `Date | null` — do not store Invalid Date).

**Step 3: R80 employeeProfile** — change:

```ts
// BAD
dateOfBirth: '',
// GOOD — keep upstream ISO or null
dateOfBirth: person.date_of_birth ?? null, // or omit field until IR profile captures it WITHOUT wiping linked CRM7 DOB
```

Read full `employeeProfile.ts` context: if intentional "capture later", use `undefined` and do not write `''` into wage-floor inputs.

**Step 4: App migration** — each app:

```ts
export { LocalisedDateInput } from '@bsuite/dates/react' // or dates
```

Bump `@bsuite/dates` dep; `rm -rf node_modules && pnpm install --ignore-workspace` in apps after publish.

**Publish gate:** Parent merge → publish-dates.yml on main → then app pin bumps. If publish blocked, keep apps on feature branches until published (doctrine).

**Step 5: Commit path-scoped per package then apps.**

**Verification:**

```bash
cd packages/dates && pnpm test && pnpm build
# R80: vitest employeeProfile + LocalisedDateInput
grep -rn "from '@/components/ui/localised-date-input'" --include="*.tsx" | wc -l  # expect 0 after
```

Close bsuite#1610 when all app copies gone + R80 DOB fixed.

---

### Task 3: WS-C — Gitleaks allowlist actually works (BSU#570)

**Objective:** Allowlist regexes match the way gitleaks evaluates them; stop generic-secret false positives on prose without disabling real secret detection.

**Files:**
- Modify: `business-suite-unified/.gitleaks.toml` (issue target)
- Possibly: parent `.gitleaks.toml` if CI uses monorepo root
- Reference: gitleaks docs — `regexTarget` is `match` | `line` | `offendingline`; path allowlists use `paths`, not `regexes` for file paths

**Known bugs from issue title:**
1. `regexTarget` wrong for intended allowlist scope
2. `generic-secret` fires on prose (`secret: "overview"` style nav keys)

**Step 1: Reproduce**

```bash
cd business-suite-unified
gitleaks detect --source . --config .gitleaks.toml -v 2>&1 | head -40
# note false positives
```

**Step 2: Fix allowlist**

- For public IDs: keep `regexes` with `regexTarget = "match"` (parent pattern is OK for content).
- For path ignores: use `paths = ['''\.env\.example$''', ...]` under `[allowlist]`.
- For generic-secret prose: tighten rule regex **or** rule-level allowlist for known nav/config keys (BSU already tried `secret\s*[:=]\s*['"](?:overview|...)` — verify with gitleaks version whether nested `[rules.allowlist]` works; if not, move to global allowlist with `regexTarget = "line"`).

**Step 3: Contract test**

Add `scripts/gitleaks-smoke.sh` or CI step:

```bash
# must exit 0 on clean tree
gitleaks detect --source . --config .gitleaks.toml --no-git -v
# fixture file with fake AKIA... must fail
```

**Step 4: Commit + close BSU#570 with before/after gitleaks output.**

---

### Task 4: WS-D — FK-index migration gate (R1 permanent control)

**Objective:** Never again merge a migration that adds `REFERENCES` without a leading btree index on that column.

**Files:**
- Create: `docs/20260724-migration-fk-index-checklist-v1.00W.md` (or section in `crm7/supabase/migrations/CLAUDE.md` / parent migrations doctrine)
- Create: `scripts/check-migration-fk-indexes.mjs` (parent or crm7) — parse new `.sql` in PR diff for `REFERENCES` columns and require `CREATE INDEX` mentioning that column
- Modify: `crm7/.github/workflows/db-lint.yml` or new workflow to run the script
- Optional: template snippet in `supabase/migrations/README.md`

**Step 1: Failing fixture**

```sql
-- fixtures/bad_migration.sql
CREATE TABLE t (id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id));
-- no index on user_id
```

Script exits 1.

**Step 2: Good fixture** exits 0 with `CREATE INDEX idx_t_user_id ON t(user_id);`

**Step 3: Wire CI on `supabase/migrations/**`**

**Step 4: Document** — every new FK: same-migration index (lessons: org_documents, email_message_links).

**No live DB changes** in this task.

---

### Task 5: WS-E — WCAG e2e harden + free-text CI visibility (crm7#1157)

**Objective:** WCAG suite cannot go green on Configuration Error shell; free-text-where-FK lint stays required and is visible.

**Files:**
- Modify: `crm7/tests/e2e/wcag-aa.spec.ts` — strengthen `assertRealRouteRendered` / fail if `[data-testid=...]` configuration error or text "Configuration Error" / "Supabase"
- Modify: `crm7/.github/workflows/e2e.yml` — confirm `VITE_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY) exported; fail job if auth setup skipped for authenticated routes when secrets present
- Verify: `crm7/.github/workflows/dry-lint.yml` is required check on protected branch (document if not; do not change branch protection without operator — instead ensure workflow runs on all PRs to development/main)

**Note:** Issue #1157 may already be partially fixed in comments (publishable key). Re-verify CI logs; if still vacuous, fix; if fixed, close with evidence and add regression assert only.

**Free-text:** Current lint is **migration-only**. Catalogue wanted form free-text CI — **YAGNI extension:** do not build full TSX free-text AST linter in this pass unless quick win. Instead: (1) keep migration dry-lint required; (2) add note in AGENTS.md that EntitySelector is mandatory; (3) optional eslint rule stub only if <1h. Prefer closing the WCAG hole over new JSX lint.

---

### Task 6: Docs + issue closeout

**Objective:** Record what shipped; close issues with evidence; update recurring-bugs doc status.

**Files:**
- Modify: `docs/20260724-recurring-bugs-and-blindspots-v1.00W.md` — mark items 1–5 status
- Feature docs if needed: `crm7/docs/20260724-report-params-null-fix-v1.00W.md`
- gh issue close with SHA + PR links

---

### Task 7: Promote all lanes

Per doctrine for each repo with commits:
1. `git merge --no-ff` feature → development
2. full gates
3. `gh pr create --base main --head development`
4. wait checks green
5. `gh pr merge --merge` (no squash, no delete-branch)
6. ff development to origin/main
7. parent submodule pointer bump

---

## Risks & tradeoffs

| Risk | Mitigation |
|------|------------|
| sanitizeReportParams breaks template that relies on `''` | Grep report-delivery / RPC for empty-string checks; prefer NULL |
| @bsuite/dates publish blocks app merges | Package-first merge; apps wait on feature branches |
| gitleaks tighten causes CI red on real docs | Fingerprint allowlist only after confirming non-secret |
| Same-repo A+E contention | Finish A fully before E on crm7 |
| Claude weekly limit | glm-5.2:cloud or direct Hermes execution |

## Open questions (defaults if unanswered)

1. **multi:* deadlock (#1162)** — include minimal fix in Task 1 if pickers disabled leave sticky state; else follow-up issue.
2. **dates package major vs minor** — default **0.2.0** minor if export additive.
3. **Branch protection required checks** — document only unless operator grants admin.

## Validation summary (definition of done)

- [ ] crm7 report apply payload has no `''` / `[]` for optional empties; tests green; #1161 closed
- [ ] `@bsuite/dates` exports LocalisedDateInput; R80 DOB not wiped; ≤1 re-export shim; #1610 closed or reduced
- [ ] `gitleaks detect` clean on BSU with fixed config; known fake secret still fails; #570 closed
- [ ] FK-index script + CI + docs live; bad fixture fails
- [ ] WCAG e2e fails closed on config error page; dry-lint still on PRs
- [ ] All PRs promoted, dev==main, parent pointers bumped
- [ ] Catalogue doc updated

## Skills for implementers

- `test-driven-development`
- `subagent-orchestration` (one lane per repo)
- `agents/ship-all-apps` / finishing-a-development-branch (promote)
- `verification-before-completion`
- Never write artifacts outside `/home/braden/Desktop/Dev/bsuite`
