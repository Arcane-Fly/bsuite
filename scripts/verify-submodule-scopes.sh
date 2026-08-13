#!/usr/bin/env bash
#
# verify-submodule-scopes.sh — prove the submodule checkout is COMPLETE.
#
# Why this exists
# ---------------
# Several parent-repo gates decide something by looking across every submodule
# at once. The edge-function collision guard in
# .github/workflows/supabase-functions-deploy.yml is the sharpest case: every
# scope deploys into ONE Supabase project, so a slug declared in two scopes has
# a single live artifact and the last deploy wins. The guard refuses to deploy
# a slug that more than one scope declares, and it establishes that by
# intersecting each scope's supabase/functions/ directory.
#
# That intersection is only as good as the checkout. A submodule that failed to
# clone — expired PAT, network blip, repo rename — leaves an EMPTY gitlink
# directory, which is byte-for-byte indistinguishable from a scope that
# genuinely declares no functions. The guard then sees ONE owner where there
# are two, calls the slug uniquely owned, and deploys it over another repo's
# live function: no diff, no failure, no signal. That is the `tga-search` class
# (2026-08-12) re-entering through the guard's own blind spot.
#
# So the precondition is asserted rather than assumed, and it fails CLOSED.
#
# What it checks, per scope
# -------------------------
#   1. The directory is a git checkout IN ITS OWN RIGHT.
#      `git -C <dir> rev-parse --git-dir` alone does NOT establish this: run
#      inside an empty directory of the superproject it walks UP and reports
#      the PARENT's git dir, exit 0. An uncloned submodule passes that test.
#      Verified by --show-toplevel resolving back to the directory itself.
#   2. The checkout sits on the commit the parent's gitlink records. A scope on
#      a different commit hands the caller an inventory of the wrong tree, so
#      its verdict is unsound even though every directory exists.
#
# Scope list
# ----------
# Derived, never hardcoded — from the UNION of .gitmodules paths and the
# gitlinks in HEAD. The union matters in both directions: a submodule added
# later is covered the day it lands, and a gitlink whose .gitmodules entry was
# deleted stays covered instead of quietly leaving the guard's field of view.
#
# Usage
# -----
#   scripts/verify-submodule-scopes.sh [repo-root]
#
# Repo root defaults to $GITHUB_WORKSPACE, then $PWD. Pass it explicitly from
# any caller with a `working-directory:` set — `git rev-parse --show-toplevel`
# is NOT a safe default there, since inside a submodule it returns the
# submodule's own root.
#
# stdout : space-separated list of verified scopes (consumable by the caller)
# stderr : human-readable diagnostics
# exit 0 : every scope present and on its recorded gitlink
# exit 1 : at least one scope missing, uncloned or on the wrong commit
# exit 2 : harness error — cannot determine the scope list at all

set -euo pipefail

ROOT="${1:-${GITHUB_WORKSPACE:-$PWD}}"

if [ ! -d "$ROOT/.git" ] && [ ! -f "$ROOT/.git" ]; then
  echo "::error::verify-submodule-scopes: '${ROOT}' is not a git repository. Cannot verify scope completeness." >&2
  exit 2
fi

# --- Scope list: union of .gitmodules paths and HEAD gitlinks ----------------
declared=""
if [ -f "$ROOT/.gitmodules" ]; then
  declared=$(git -C "$ROOT" config -f .gitmodules --get-regexp '^submodule\..*\.path$' \
               | sed 's/^[^ ]* //' || true)
fi

# ls-tree emits "<mode> SP <type> SP <object> TAB <path>"; gitlinks are type
# "commit". Splitting on the TAB keeps paths containing spaces intact.
linked=$(git -C "$ROOT" ls-tree -r HEAD 2>/dev/null | grep -E '^[0-9]+ commit ' | cut -f2 || true)

# LC_ALL=C keeps the ordering byte-deterministic. Callers compare this list
# across steps to prove they ran against the same tree, so a locale-dependent
# collation would turn an environment difference into a spurious mismatch.
SCOPES=$(printf '%s\n%s\n' "$declared" "$linked" | sed '/^$/d' | LC_ALL=C sort -u)

if [ -z "$SCOPES" ]; then
  echo "::error::verify-submodule-scopes: no submodule scopes found in .gitmodules or in HEAD's gitlinks. A cross-scope gate cannot prove anything without the scope list, and a guess overwrites another repo's work." >&2
  exit 2
fi

# --- Per-scope verification --------------------------------------------------
# Two distinct faults, tracked separately: they have the same consequence for a
# cross-scope gate (its inventory is not the tree the parent records) but
# completely different causes, and a summary that blames the wrong one sends
# whoever reads it to the wrong place.
UNCLONED=0
DRIFTED=0
VERIFIED=""

while IFS= read -r scope; do
  [ -n "$scope" ] || continue
  dir="$ROOT/$scope"

  if [ ! -d "$dir" ]; then
    echo "::error::Scope '${scope}' is missing entirely — the submodule directory does not exist. Failing closed: a cross-scope gate would read it as declaring nothing." >&2
    UNCLONED=1
    continue
  fi

  # A real submodule checkout always has a .git entry (a file pointing at
  # ../.git/modules/<name>, or a directory for old-style checkouts). An empty
  # gitlink placeholder has none.
  if [ ! -e "$dir/.git" ]; then
    echo "::error::Scope '${scope}' has no .git entry — the submodule was never cloned (empty gitlink placeholder). Failing closed: it is indistinguishable from a scope that declares nothing." >&2
    UNCLONED=1
    continue
  fi

  # Resolve --show-toplevel back to this directory. Without this, an empty
  # subdirectory of the superproject passes any plain `rev-parse` check by
  # walking up to the parent repository.
  expected=$(cd "$dir" && pwd -P)
  toplevel=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)
  toplevel=$(cd "$toplevel" 2>/dev/null && pwd -P || true)

  if [ -z "$toplevel" ] || [ "$toplevel" != "$expected" ]; then
    echo "::error::Scope '${scope}' is not a git checkout in its own right (resolves to '${toplevel:-<none>}', expected '${expected}'). Its clone failed. Failing closed." >&2
    UNCLONED=1
    continue
  fi

  recorded=$(git -C "$ROOT" rev-parse "HEAD:${scope}" 2>/dev/null || true)
  actual=$(git -C "$dir" rev-parse HEAD 2>/dev/null || true)

  if [ -z "$recorded" ]; then
    echo "::error::Scope '${scope}' is checked out but HEAD records no gitlink for it. A cross-scope gate cannot establish which source tree this scope owns. Failing closed." >&2
    DRIFTED=1
    continue
  fi

  if [ "$recorded" != "$actual" ]; then
    echo "::error::Scope '${scope}' is checked out at ${actual:-<none>} but the gitlink records ${recorded}. A cross-scope gate would inventory the WRONG tree, so its verdict cannot be trusted. Failing closed." >&2
    DRIFTED=1
    continue
  fi

  VERIFIED="${VERIFIED}${VERIFIED:+ }${scope}"
done <<EOF
$SCOPES
EOF

if [ "$UNCLONED" != "0" ] || [ "$DRIFTED" != "0" ]; then
  {
    echo ""
    if [ "$UNCLONED" != "0" ]; then
      echo "SCOPE NOT CLONED — one or more submodules are missing from the"
      echo "checkout. In CI this is almost always BSUITE_CROSS_REPO_PAT lacking"
      echo "read access to that submodule's repo, or a 'submodules:' setting"
      echo "that no longer covers it. Locally, run:"
      echo "    git submodule update --init --recursive"
    fi
    if [ "$DRIFTED" != "0" ]; then
      [ "$UNCLONED" != "0" ] && echo ""
      echo "SCOPE ON THE WRONG COMMIT — one or more submodules are cloned but"
      echo "sitting on a commit the parent's gitlink does not record. On a"
      echo "developer tree that is the normal mid-work state: the submodule has"
      echo "moved ahead and the parent pointer has not been bumped yet. In CI it"
      echo "means the checkout did not land on the recorded gitlink, and the"
      echo "inventory would come from a different tree than the commit under"
      echo "test. To inspect a dev tree without this check, read the directories"
      echo "directly — do NOT relax the gate: its whole value is refusing to"
      echo "answer from a tree it cannot identify."
    fi
    echo ""
    echo "Callers deliberately do NOT proceed: a cross-scope gate that falls"
    echo "open here reverts another repo's deployed work with no diff, no"
    echo "failure and no signal."
  } >&2
  exit 1
fi

echo "verify-submodule-scopes: ${VERIFIED}" >&2
printf '%s\n' "$VERIFIED"
