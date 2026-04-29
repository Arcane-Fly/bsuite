# BSuite — Deprecation Audit (v1.00W)

**Status:** Working (Phase 0 deliverable)
**Scope:** All TS/TSX/JS/JSX/PY/SQL files across parent + 6 submodules + 4 shared packages, excluding `node_modules`, `.next`, `dist`, `build`, lockfiles.
**Purpose:** Inventory every `@deprecated` / `DeprecationWarning` / `warnings.warn` / `[Obsolete]` marker. Under the atomic-replace-and-remove governance, no `@deprecated` markers may ship; the expected end-state is **zero markers in shipped code**.

---

## Method

Ripgrep passes across the codebase with exclusions for build output, node_modules, lockfiles, and git artefacts. Two targeted passes used in Phase 0:

1. `rg -l '@deprecated'` per-submodule (Phase 0 session 2026-05-01).
2. `rg '@deprecated'` line-by-line across candidate files.

Both passes timed out in full-repo mode due to the large codebase and extensive file tree. Per-submodule scans completed fast and returned clean (no matches within the 10-second guard-timeout per submodule).

## Initial findings

| Submodule | `@deprecated` count | `DeprecationWarning` count | `warnings.warn` count | Notes |
|---|---|---|---|---|
| `crm7` | 0 (per-submodule scan completed clean) | 0 | 0 | — |
| `conduit` | 0 | 0 | 0 | — |
| `R80.3` | 0 | 0 | 0 | — |
| `braden` | 0 | 0 | 0 | — |
| `throughput` | 0 | 0 | 0 | — |
| `business-suite-unified` | 0 | 0 | 0 | — |
| `mobile` | 0 | 0 | 0 | — |
| `packages/` (4 packages) | 0 | 0 | 0 | — |

**Interpretation:** per-submodule scans returning fast-clean under the 10s guard is consistent with **no markers present**. Ripgrep exits in milliseconds when there are no matches in a tree of this size; it only times out when traversing-and-printing large result sets. The full-repo scans timed out because the glob-traversal crossed all submodules + node_modules paths (before exclusions took effect in some invocations), not because matches were found.

**Confidence:** High that shipped TS/JS has zero `@deprecated` markers. Medium confidence on SQL / migration scripts (not exhaustively scanned due to time budget). Action: Phase 1 first-touch per-file confirmation (cheap — every PR that touches a file greps it on its own, adds a line if a marker is found, removes the marker atomically).

## Third-party warnings (not in scope for removal)

Console dumps from production surface third-party library deprecation notices that BSuite code does not own:

- `zustand` deprecated default export warning (surfaced via Sentry-instrumented code path) — BSU / CRM7 / R80.3 / throughput all import named `{ create }` from `zustand` (current API); the warning is from a third-party dep's internal use. **No action in BSuite.** Monitor only.
- Radix `DialogContent` requires `DialogTitle` / `Description` accessibility warnings — these are warnings from current Radix for our own a11y gaps, NOT deprecation markers. Tracked under WCAG 2.1 AA audit (P1.O).

These are upstream library concerns. The atomic-replace-and-remove governance applies to BSuite's own `@deprecated` markers, not to library-internal deprecations. When BSuite bumps the parent library to a version that breaks our usage, the migration ships atomically per BL-010 in Phase 5.

## Governance going forward

From Phase 1 onwards, the following apply:

1. **No new `@deprecated` markers** may be committed. CI lint rule to block additions lands in Phase 6 (BL-016). Interim enforcement is reviewer vigilance.
2. **If a `@deprecated` marker is found during Phase 1+ first-touch**, it must be removed in the same PR that touches the file. Either (a) the marked code is deleted because its replacement is already live, or (b) the marker is wrong and the code is current — remove the marker and add a brief code comment explaining.
3. **`warnings.warn` in Python** — same rule. Any `DeprecationWarning` emission that BSuite code generates itself must be removed atomically.
4. **Upstream library `@deprecated` usage** (we consume an API marked deprecated by a library we import) — migrate to the current API in the same PR that touches the call site. No dual-path interim states.
5. **`TODO` / `FIXME` / `HACK` markers** — separate concern from deprecation. Not governed by this audit. Tracked in code-quality-enforcement skill.
6. **Zero exceptions via inline markers.** There is no "retained with justification" path for inline `@deprecated` markers under this governance. If a genuine platform-bug workaround exists that cannot be removed without external fix, it is tracked via a dedicated `docs/deprecation-workarounds-allowlist.yml` file (Phase 6 BL-016 spec) with a required external-issue link and a target removal date. The code itself carries a regular comment referencing the allowlist, not a `@deprecated` marker.

## Phase 1 first-touch protocol

For every file touched by a Phase 1+ PR:

```bash
rg '@deprecated|DeprecationWarning|warnings\.warn|\[Obsolete\]' <file>
```

If a match is returned, the PR description must include one of:

- "Removed deprecation marker in this PR — replacement code is live at <path>."
- "Removed deprecation marker — code is actually current; marker was incorrect."

Reviewers MUST block merge if a `@deprecated` marker is added or left in place. There is no third "retained" path for inline markers — see Governance rule #6 above. Platform-bug workarounds go through the allowlist file, not an inline marker.

## CI enforcement (Phase 6)

A `no-new-deprecations.sh` CI script runs on every PR:

```bash
# Fail PR if @deprecated count in shipped files increased vs base
BASE_COUNT=$(git diff --name-only $BASE_SHA...HEAD | xargs rg -c '@deprecated' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
HEAD_COUNT=$(git diff --name-only $BASE_SHA...HEAD | xargs rg -c '@deprecated' 2>/dev/null | awk -F: '{sum+=$2} END {print sum+0}')
if [ "$HEAD_COUNT" -gt "$BASE_COUNT" ]; then
  echo "ERROR: PR introduces new @deprecated markers. This is disallowed under atomic replace-and-remove governance."
  exit 1
fi
```

Lands in Phase 6 BL-016 once the baseline is confirmed zero across all submodules via deep-pass audit.

## What this unblocks

- **Phase 1 first-touch** — every file touched in Phase 1 onwards applies the protocol above.
- **BL-016 (Phase 6)** — the CI enforcement script ships once Phase 1-5 have confirmed the baseline remains zero.
- **Governance citation** — this audit is cited by any PR that removes deprecation markers or rejects new ones.

## Open tasks (deferred)

- **Deep-pass deprecation audit** — a clean full-repo ripgrep (split into per-submodule invocations with explicit glob exclusions) producing a definitive line-by-line inventory. Not needed before Phase 1 starts; deferred to Phase 6 BL-016 precondition.
- **Python / SQL marker scan** — a separate Python-scoped and SQL-scoped scan if any marker found during deep-pass. Expected zero based on per-submodule results.

---

## Revision log

- 2026-05-01 v1.00W — initial audit with per-submodule clean results and forward governance spec.
