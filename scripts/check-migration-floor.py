#!/usr/bin/env python3
"""
Reject a NEW migration that is structurally incapable of ever running.

WHAT THIS COVERS THAT NOTHING ELSE DOES
---------------------------------------
`.github/workflows/supabase-migrate.yml` skips every migration whose version is
below MIGRATION_FLOOR:

    if [ "$VERSION" \\< "$MIGRATION_FLOOR" ]; then
      echo "→ Pre-floor ($MIGRATION_FLOOR): $f — ... skipping"
      continue

The floor is correct — everything below it is superseded by the 2026-05-13
production baseline dump. But a NEW migration stamped below the floor is not
"missed": the pipeline is designed never to run it, on every deploy, forever.
It merges, CI goes green, and it produces no error anywhere.

`prod-migration-history-audit.yml` cannot catch this. It audits ledger drift
for files AT OR ABOVE the floor and deliberately excludes the pre-floor
backlog (its own header says so), which is correct for its purpose and is
exactly why a newly-added sub-floor file falls through every existing gate.

That is not hypothetical. Measured 2026-08-05, two such migrations were live
and both presented as UI bugs rather than DB errors:

  * user_preferences.date_format -> /settings/locale could not read or write
    its own setting (42703) since 2026-05-11.
  * jodie_bug_reports            -> jodie-bug-create is DEPLOYED and answering
    204 while inserting into a table that does not exist, so no Jodie bug
    report had EVER persisted.

Neither was found by a gate. One was found by a human walking the UI.

DELIBERATELY NOT DUPLICATED HERE
--------------------------------
Version collisions are already covered, and better, by
`migration-version-collision-lint.yml` + `scripts/check-migration-collisions*`
— full-tree scope, a 27-entry allowlist of historical collisions with a
verified reason each, and same-scope collisions graded as higher risk. An
earlier draft of this script re-implemented that check; it was removed rather
than shipped as a second, weaker copy.

Ledger drift for at/above-floor files is covered by
`prod-migration-history-audit.yml`. This script does not query the database.

Usage:
    check-migration-floor.py --base <ref>   # files ADDED since <ref> (CI)
    check-migration-floor.py                # audit the whole tree (report only)
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
APPLIER = WORKFLOWS / "supabase-migrate.yml"
AUDIT = WORKFLOWS / "prod-migration-history-audit.yml"

# Read the floor from the workflow rather than restating it. A second copy of a
# predicate drifts from the one that actually runs, and then the gate goes green
# while the hazard is still live.
FLOOR_LINE = re.compile(r"^\s*MIGRATION_FLOOR:\s*'([0-9]+)'\s*$", re.MULTILINE)

# Directories holding COPIES of the tree. Scanning them makes every migration
# collide with its own duplicate — an early run of this script reported 1399
# files where the real tree has 690.
EXCLUDED_PARTS = {".claude", "node_modules", ".vercel", "dist", "build", ".git"}


def floor_in(path: Path) -> str | None:
    if not path.is_file():
        return None
    match = FLOOR_LINE.search(path.read_text(encoding="utf-8"))
    return match.group(1) if match else None


def read_floor() -> str:
    """The applier's floor is authoritative — it is the one that actually runs."""
    floor = floor_in(APPLIER)
    if floor is None:
        sys.exit(
            f"FATAL: no MIGRATION_FLOOR found in {APPLIER.name}. It was renamed or "
            "removed. Fix this script against the real predicate rather than "
            "hardcoding a value here."
        )
    return floor


def check_floor_sync(applier_floor: str) -> str | None:
    """
    prod-migration-history-audit.yml carries its OWN copy of MIGRATION_FLOOR and
    its header states it 'must be kept in sync ... by hand'. A hand-synced
    predicate is a drift hazard with no alarm on it, so assert it here — this is
    free and the audit silently changes meaning if the two ever diverge.
    """
    audit_floor = floor_in(AUDIT)
    if audit_floor is None or audit_floor == applier_floor:
        return None
    return (
        f"FLOOR DESYNC: {APPLIER.name} has {applier_floor} but {AUDIT.name} has "
        f"{audit_floor}.\n"
        f"    These are hand-synced by design (see that workflow's header). While "
        f"they disagree the audit is reporting against a floor the applier does "
        f"not use.\n"
        f"    Fix: set both to the same value."
    )


def version_of(path: Path) -> str | None:
    """Leading digits of the basename, matching the applier's own parsing."""
    stem = path.name.split("_", 1)[0]
    return stem if stem.isdigit() else None


def migrations_in_tree() -> list[Path]:
    return sorted(
        path
        for path in REPO_ROOT.glob("**/supabase/migrations/*.sql")
        if not EXCLUDED_PARTS.intersection(path.relative_to(REPO_ROOT).parts)
    )


def migrations_added_since(base: str) -> list[Path]:
    # An unset BASE_REF in CI would otherwise reach git as "origin/" and fail
    # with a raw "ambiguous argument" that reads like a repo problem rather
    # than a misconfigured workflow.
    if base.rstrip("/") in ("", "origin"):
        sys.exit(
            f"FATAL: --base got '{base}' — the base ref is empty. In CI that "
            "means BASE_REF was not set on the step. Refusing to run, because "
            "an empty base would silently check zero files and pass."
        )
    try:
        out = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=A", f"{base}...HEAD"],
            cwd=REPO_ROOT, capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError as exc:
        sys.exit(f"FATAL: git diff against '{base}' failed: {exc.stderr.strip()}")
    return [
        REPO_ROOT / line
        for line in out.splitlines()
        if "/supabase/migrations/" in line and line.endswith(".sql")
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="only check migrations ADDED since this ref")
    args = parser.parse_args()

    floor = read_floor()
    scoped = migrations_added_since(args.base) if args.base else migrations_in_tree()
    scope = f"added since {args.base}" if args.base else "in the tree"

    print(f"MIGRATION_FLOOR = {floor}  (read from {APPLIER.name})")
    print(f"Checking {len(scoped)} migration(s) {scope}.\n")

    failures: list[str] = []

    desync = check_floor_sync(floor)
    if desync:
        failures.append(desync)

    below = [p for p in scoped if (version_of(p) or floor) < floor]

    if args.base:
        for path in below:
            failures.append(
                f"BELOW FLOOR: {path.relative_to(REPO_ROOT)}\n"
                f"    version {version_of(path)} < floor {floor}, so the applier "
                f"skips it on EVERY deploy, forever.\n"
                f"    Fix: re-stamp above the floor. Do NOT edit the original file "
                f"in place if it is already merged — the floor excludes it "
                f"regardless of its contents."
            )
    elif below:
        # The pre-existing backlog is known and owned by the
        # history-reconciliation lane. Failing on it would make this gate red
        # forever and it would be switched off within a day.
        print(
            f"INFO: {len(below)} pre-existing migration(s) sit below the floor — "
            f"the reconciliation lane's backlog, not failed here.\n"
            f"      Their presence is NOT proof the objects are missing: 18 of "
            f"them were applied out-of-band. Only the live catalog settles that, "
            f"and this script does not query it.\n"
        )

    if failures:
        print(f"FAILED — {len(failures)} problem(s):\n")
        for failure in failures:
            print(f"  {failure}\n")
        print(
            "A migration that cannot run produces no error anywhere: the feature "
            "ships, the page renders, the function returns 204, and only the "
            "network tab knows."
        )
        return 1

    print("OK — no new migration is stranded below the floor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
