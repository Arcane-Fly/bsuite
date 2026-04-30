# ROADMAP Audit Delta — 2026-04-15 NU4GF

**Version:** 1.00W
**Status:** Working
**Session:** claude-loop ROADMAP rotation, tracker [bsuite#181](https://github.com/GaryOcean428/bsuite/issues/181), suffix `NU4GF`
**Previous rotation:** [bsuite#179](https://github.com/GaryOcean428/bsuite/issues/179) (PERF → [crm7#196](https://github.com/GaryOcean428/crm7/pull/196)) → "Next task: ROADMAP"

---

## Summary

This delta captures the output of a direct source-vs-roadmap audit run against `bsuite/main` at commit `cdb82834` (after [bsuite#176](https://github.com/GaryOcean428/bsuite/pull/176) merged, bumping the master roadmap to v5.02W). The audit discovered that **four outstanding P2 `#26` subtasks** inherited from the 2026-03-17 [BSuite Gap Report v2](./20260317-bsuite-gap-report-v2.00W.md) (RT-7, RT-8, RT-9, CC-1) were all already satisfied on `main` — the master roadmap had drifted out of sync because the underlying work had landed in unrelated PRs (patch-round DEPS rotations and the 2026-03-17 Universal Page Canvas sweep) without the `#26` entries being crossed off.

Net effect: **P2 `#26` track drops from 4 outstanding subtasks to 0**. The remaining open items in the `#26` group are `#26b` (DRY auto-population chains) and `#26d` (DB FK migrations + ContactSelector on 9 forms).

This file is a delta, not a rewrite. A companion agent-handoff issue asks **ship-all-apps** to roll the findings into the master roadmap (`docs/20260227-bsuite-master-roadmap-v5.00W.md`, currently header-tagged v5.02W) on its next `--admin` pass, bumping the master header to v5.03W and crossing off the four subtasks listed below.

---

## Methodology

For each of the four `#26` subtasks below, the audit read the actual source file(s) named in the roadmap entry against the `main` branch tip of the relevant repo, using the GitHub REST API (`gh api repos/<owner>/<repo>/contents/<path>?ref=<branch>`). No clones were required; no side effects were taken on the read repositories.

The one code-side deliverable from this audit — a regression-guard test for `#26a` — is shipped in a separate PR on crm7: [crm7#197](https://github.com/GaryOcean428/crm7/pull/197).

---

## Finding 1 — `#26a` `DashboardPageEditorDrawer` keyboard-accessible drag

**Claim (Gap Report v2 CC-1 / roadmap v5.02W):**
> CC-1: DashboardPageEditorDrawer accessibility — add `KeyboardSensor` + `sortableKeyboardCoordinates` + `aria-label` on grip buttons | crm7 | 2h

**Reality:** Already implemented on `crm7/main`.

**Evidence:** `src/components/platform/DashboardPageEditorDrawer.tsx` (crm7/main, commit `8e731635`):

- **Line 1** — `import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';` — `KeyboardSensor` is imported alongside `PointerSensor`.
- **Line 2** — `import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';` — `sortableKeyboardCoordinates` coordinate-getter imported.
- **Lines 126–129** (`DashboardPageEditorDrawer` body):
  ```tsx
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  ```
  Both sensors are activated; the `coordinateGetter` wires `sortableKeyboardCoordinates` into the keyboard drag-move arithmetic.
- **Lines 93–103** (`SortableRow` grip):
  ```tsx
  <button
    type="button"
    className="cursor-grab text-muted-foreground active:cursor-grabbing"
    {...attributes}
    {...listeners}
    aria-label={`Reorder ${label}`}
  >
    <GripVertical className="h-4 w-4" />
  </button>
  ```
  The grip is a native `<button>` (WCAG-compliant keyboard-focusable element) with a screen-reader-auditable `aria-label` per item.

**Audit action:** Regression-guard test shipped in [crm7#197](https://github.com/GaryOcean428/crm7/pull/197). The test pins all three a11y contracts:

1. Every metric row's grip is a `<button>` with `aria-label="Reorder {metric label}"`.
2. Every panel row's grip is the same.
3. Every grip's `tagName === 'BUTTON'` (not a `<div role="button">` wrapper — such a wrapper would satisfy dnd-kit's listeners but silently break default keyboard focus semantics).

Also pinned: `DEFAULT_DASHBOARD_EDITOR_PREFS` shape (column counts, order lengths, empty `hiddenMetrics`/`hiddenPanels`) and the visibility toggle button count.

**Roadmap update requested:**

- In the "Remaining Work Summary → P2 #26" table row for `26a`, change pending to ✅ Done (2026-04-15), wrap the description in `~~strike~~`, and add a reference to [crm7#197](https://github.com/GaryOcean428/crm7/pull/197).
- In the "Audit Sprint Status (2026-04-14)" table row for AUD-16, change 🔲 to ✅ and reference crm7#197.

---

## Finding 2 — `#26e` `@types/node` bump to `^24.x` across all 5 apps

**Claim (Gap Report v2 RT-7 / roadmap v5.02W):**
> `@types/node` upgrade to `^24.x` across all 5 apps | all | 30m

**Reality:** All 5 apps are already past the target. The upgrade overshot `^24.x` to `^25.x` during earlier DEPS rotations and the `#26e` entry was never crossed off.

**Evidence:** `devDependencies."@types/node"` across the 5 `package.json` files at `main`/`master` tip:

| App | Branch | `@types/node` version |
|-----|--------|-----------------------|
| **crm7** | `main` @ `8e731635` | `^25.5.0` |
| **business-suite-unified** | `master` @ `173ad559` | `^25.6.0` |
| **conduit** | `main` @ `638d82ef` | `^25.6.0` |
| **R80.3** | `main` @ `33d88adb` | `^25.5.0` |
| **braden** | `main` @ `4620474f` | `^25.5.0` |

Every value is strictly greater than the `^24.x` target. No action required.

**Roadmap update requested:**

- In the P2 `#26` table row for `26e`, change pending to ✅ Done (2026-04-15) and wrap the description in `~~strike~~`.
- In the "Audit Sprint Status" table row for AUD-15, change 🔲 to ✅ for the RT-7 portion.

---

## Finding 3 — `#26f` pnpm version alignment to `10.32.1`

**Claim (Gap Report v2 RT-8 / roadmap v5.02W):**
> pnpm version alignment to `10.32.1` (BSU, braden, conduit, R80.3 behind CRM7) | all | 30m

**Reality:** All 5 `package.json` `packageManager` fields now read `pnpm@10.32.1`. The alignment work was quietly completed during the 2026-04-14 morning DEPS/Node-24 rotation and the `#26f` entry was never crossed off.

**Evidence:** `packageManager` field across the 5 `package.json` files at `main`/`master` tip:

| App | Branch | `packageManager` |
|-----|--------|------------------|
| **crm7** | `main` @ `8e731635` | `pnpm@10.32.1+sha512.a706938f0e89ac1456b6563eab4edf1d1faf3368d1191fc5c59790e96dc918e4456ab2e67d613de1043d2e8c81f87303e6b40d4ffeca9df15ef1ad567348f2be` |
| **business-suite-unified** | `master` @ `173ad559` | `pnpm@10.32.1` |
| **conduit** | `main` @ `638d82ef` | `pnpm@10.32.1` |
| **R80.3** | `main` @ `33d88adb` | `pnpm@10.32.1` |
| **braden** | `main` @ `4620474f` | `pnpm@10.32.1` |

crm7 is the only repo still carrying the integrity-hash suffix (`+sha512.a706938f...`) alongside the version. The four other repos use the plain `pnpm@10.32.1` form. All five resolve to the same minor+patch line, so corepack and CI pin identically. No action required.

**Roadmap update requested:**

- In the P2 `#26` table row for `26f`, change pending to ✅ Done (2026-04-15) and wrap the description in `~~strike~~`.
- In the "Audit Sprint Status" table row for AUD-15, change 🔲 to ✅ for the RT-8 portion.

---

## Finding 4 — `#26g` R80.3 `@vitest/coverage-v8` missing

**Claim (Gap Report v2 RT-9 / roadmap v5.02W):**
> R80.3: add `@vitest/coverage-v8 ^4.0.0` (missing, blocks `pnpm test:coverage`) | R80.3 | 15m

**Reality:** `R80.3/package.json` devDependencies already include `"@vitest/coverage-v8": "^4.1.4"`. The package was quietly added during an earlier TESTS rotation.

**Evidence:** `R80.3/package.json` at `main` @ `33d88adb`:

```json
"devDependencies": {
  ...
  "@vitejs/plugin-react": "^6.0.1",
  "@vitest/coverage-v8": "^4.1.4",
  "@vitest/ui": "^4.1.4",
  ...
}
```

The declared version `^4.1.4` is both strictly greater than the Gap Report target `^4.0.0` and is in lockstep with the `vitest@^4.1.4` that ships in the same repo. `pnpm test:coverage` is unblocked. No action required.

**Roadmap update requested:**

- In the P2 `#26` table row for `26g`, change pending to ✅ Done (2026-04-15) and wrap the description in `~~strike~~`.
- In the "Audit Sprint Status" table row for AUD-15, change 🔲 to ✅ for the RT-9 portion.

---

## Roadmap rollup request (for ship-all-apps on next `--admin` pass)

The master roadmap at `docs/20260227-bsuite-master-roadmap-v5.00W.md` (currently header-tagged v5.02W) should be updated as follows:

1. **Header bump:** `Version: 5.02W` → `Version: 5.03W`; `Last Updated: 2026-04-14 (afternoon batch — post-TESTS rotation)` → `Last Updated: 2026-04-15 (ROADMAP rotation audit — 4 stale #26 subtasks confirmed complete)`.

2. **P2 table rows `26a`, `26e`, `26f`, `26g`:** Strike the description, change the effort column to `✅ Done (2026-04-15)`, and (for `26a`) add a reference to [crm7#197](https://github.com/GaryOcean428/crm7/pull/197).

3. **Audit Sprint Status (2026-04-14) rows `AUD-15`, `AUD-16`:** Change 🔲 to ✅ and reference this audit delta doc.

4. **New "Recently Completed (as of 2026-04-15 — ROADMAP rotation audit)" section** at the top of the Recently Completed block, above the existing 2026-04-14 afternoon block, summarizing the four findings above and pointing at this delta doc + crm7#197.

A companion agent-handoff issue ([bsuite#...](https://github.com/GaryOcean428/bsuite/issues/)) will be filed asking ship-all-apps to action this rollup.

---

## Related links

- Session tracker: [bsuite#181](https://github.com/GaryOcean428/bsuite/issues/181)
- Regression-guard test PR: [crm7#197](https://github.com/GaryOcean428/crm7/pull/197)
- Master roadmap (v5.02W): [`20260227-bsuite-master-roadmap-v5.00W.md`](./20260227-bsuite-master-roadmap-v5.00W.md)
- BSuite Gap Report v2 (2026-03-17): [`20260317-bsuite-gap-report-v2.00W.md`](./20260317-bsuite-gap-report-v2.00W.md)
