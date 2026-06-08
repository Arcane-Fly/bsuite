#!/usr/bin/env python3
"""Rebuild docs/dashboard/data/dashboard-data.json from live repo state.

Strategy: load the existing JSON to preserve hand-curated narrative fields
(plan rows, prose summaries, hand-graded statuses), then overlay live counts
and version pins where they can be derived deterministically.

Failure mode: if any live source can't be read, keep the prior value. The
hourly workflow re-runs, so transient gh-CLI failures self-heal next tick.
The script never raises — a degraded refresh is better than a failed commit.

Run from repo root:

    tmp=$(mktemp)
    python3 docs/dashboard/refresh-data.py > "$tmp"
    mv "$tmp" docs/dashboard/data/dashboard-data.json
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = REPO_ROOT / "docs" / "dashboard" / "data" / "dashboard-data.json"

SUBMODULES = ["crm7", "conduit", "business-suite-unified", "R80.3", "braden", "throughput"]


def _run(cmd: list[str], cwd: Path | None = None) -> str | None:
    try:
        out = subprocess.run(
            cmd,
            cwd=cwd or REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if out.returncode != 0:
            return None
        return out.stdout.strip()
    except Exception:
        return None


def count_active_plans(repo_path: Path) -> int | None:
    plans_dir = repo_path / "docs" / "plans"
    if not plans_dir.is_dir():
        return None
    n = 0
    for p in plans_dir.glob("*.md"):
        if p.name.lower() == "readme.md":
            continue
        n += 1
    return n


def count_archived_plans(repo_path: Path) -> int | None:
    archive_dir = repo_path / "docs" / "plans" / "archive"
    if not archive_dir.is_dir():
        return 0
    n = 0
    for p in archive_dir.rglob("*.md"):
        if p.name.lower() == "readme.md":
            continue
        n += 1
    return n


def head_sha(repo_path: Path, ref: str = "HEAD") -> str | None:
    sha = _run(["git", "rev-parse", "--short", ref], cwd=repo_path)
    return sha


def submodule_gitlink_sha(name: str) -> str | None:
    """Return the parent-recorded gitlink SHA for an uninitialized submodule."""
    out = _run(["git", "ls-tree", "HEAD", name])
    if not out:
        return None
    parts = out.split()
    if len(parts) < 3 or parts[1] != "commit":
        return None
    return parts[2][:7]


def is_git_checkout(repo_path: Path) -> bool:
    return (repo_path / ".git").exists()


def package_version(pkg_json_path: Path) -> str | None:
    try:
        return json.loads(pkg_json_path.read_text()).get("version")
    except Exception:
        return None


def update_repos(data: dict) -> None:
    """Refresh per-repo plan counts and main SHAs."""
    repos = data.get("repos") or []
    for row in repos:
        name = row.get("name")
        if not name:
            continue
        repo_path = REPO_ROOT if name == "bsuite" else (REPO_ROOT / name)
        if not repo_path.is_dir():
            continue
        if name == "bsuite" or is_git_checkout(repo_path):
            ap = count_active_plans(repo_path)
            if ap is not None:
                row["active_plans"] = ap
            ar = count_archived_plans(repo_path)
            if ar is not None:
                row["archived"] = ar
            sha = head_sha(repo_path)
        else:
            sha = submodule_gitlink_sha(name)
        if sha:
            row["main_sha"] = sha


def update_package_versions(data: dict) -> None:
    """Refresh @bsuite/auth and @bsuite/dry-lint version pins if surfaced in data."""
    pkgs = data.get("shared_packages")
    if not isinstance(pkgs, list):
        return
    for entry in pkgs:
        slug = (entry.get("name") or "").split("/")[-1]
        candidate = REPO_ROOT / "packages" / slug / "package.json"
        if candidate.is_file():
            v = package_version(candidate)
            if v:
                entry["version"] = v


def update_meta(data: dict) -> None:
    meta = data.setdefault("meta", {})
    today = _run(["date", "-u", "+%Y-%m-%d"]) or meta.get("audit_date")
    if today:
        meta["last_refresh"] = today


def main() -> int:
    if not DATA_FILE.is_file():
        # Nothing to overlay onto — emit empty object so the workflow guard
        # catches it without losing the file entirely.
        sys.stdout.write("{}\n")
        return 0

    try:
        data = json.loads(DATA_FILE.read_text())
    except Exception as e:
        sys.stderr.write(f"::warning::could not parse existing dashboard JSON: {e}\n")
        sys.stdout.write(DATA_FILE.read_text())
        return 0

    # Each updater is best-effort; failures inside leave the prior value intact.
    try:
        update_repos(data)
    except Exception as e:
        sys.stderr.write(f"::warning::update_repos failed: {e}\n")
    try:
        update_package_versions(data)
    except Exception as e:
        sys.stderr.write(f"::warning::update_package_versions failed: {e}\n")
    try:
        update_meta(data)
    except Exception as e:
        sys.stderr.write(f"::warning::update_meta failed: {e}\n")

    sys.stdout.write(json.dumps(data, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
