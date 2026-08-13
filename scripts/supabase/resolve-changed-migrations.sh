#!/usr/bin/env bash
#
# Resolve WHICH migration files a pull request changes, across the parent tree
# and every submodule whose gitlink moved. Prints a comma-separated list on
# stdout; every diagnostic goes to stderr so the caller can capture the list
# with a plain command substitution.
#
# WHY THIS IS A SCRIPT AND NOT TEN LINES OF YAML (bsuite#1964)
# ───────────────────────────────────────────────────────────
# Because it has to be SEEN TO FAIL. The rehearsal workflow already refuses to
# trust its own replay engine without a self-test — "a gate never seen to fail
# is not a gate" — and this selector is the input to that engine. A selector
# that silently returns an empty list turns the whole rehearsal green while
# gating nothing. `--self-test` plants four pointers and asserts all four
# verdicts on every run — diffable, diffable-only-after-a-fetch, and undiffable
# for each of the two distinct causes. Both directions, and both causes.
#
# The emitted path format is load-bearing and is checked by construction against
# rehearse-migrations.mjs: it builds `rel` as
# `path.posix.join(scope.migrations_dir, basename)`, and the engine matches the
# --changed set on that string. If the two ever diverge, EVERY changed migration
# silently fails to match, nothing is judged, and the job still reports green.
# Verified 2026-08-13 against the engine's own `--plan --json` rel set (342
# entries): a selector-emitted crm7 path was present.
#
# THE POSTURE: FAIL CLOSED, THE WAY check-migration-floor.py DOES
# ──────────────────────────────────────────────────────────────
# When a pointer moves and the diff cannot be computed, this script EXITS
# NON-ZERO. It does not warn, and it does not fall back to gating the whole
# scope.
#
# The sibling gate `scripts/check-migration-floor.py` already had this right:
#
#   FATAL: cannot diff R80.4 98961198..b63f4dac — the submodule clone is
#          missing one of those commits.
#          Refusing to pass on a scope that was not examined.
#
# Over-gating (replaying every migration in the scope) was considered and
# rejected. It is not a safe fallback here, because an unresolvable pointer is
# not merely an inconvenience for this job — it is a BROKEN REPOSITORY STATE.
# A parent commit that pins a submodule SHA which does not exist on the
# submodule's remote cannot be cloned by anyone: `git submodule update` fails
# for every consumer, forever. Over-gating would let that pointer merge with a
# green tick. The pointer has to be corrected, so the PR has to go red.
#
# WHY A POINTER GOES MISSING, MEASURED — AND WHY THE OBVIOUS FIX IS WRONG
# ──────────────────────────────────────────────────────────────────────
# R80.4's ruleset enforces `required_linear_history`, so its PRs land by REBASE,
# which rewrites SHAs. A lane that advances the parent gitlink to a pre-rebase
# commit pins a SHA the rebase orphaned. (The repo settings advertise
# `allow_merge_commit=true`; the ruleset overrides it, and the API error never
# mentions linear history — which is what makes this recur.)
#
# The obvious fix — "fetch harder" — is half right, and the half that is wrong
# matters. Measured against github.com on 2026-08-13, in a FRESH clone, with a
# three-way control:
#
#   commit                                     bare-SHA fetch      object after
#   ─────────────────────────────────────────  ──────────────────  ────────────
#   b63f4dac… reachable from a branch          rc=0                PRESENT
#   98961198… orphaned, 0 refs contain it      rc=0                PRESENT
#   0123456789… does not exist                 rc=128 not our ref  ABSENT
#
# So GitHub DOES serve an orphaned object by bare SHA — `allowAnySHA1InWant` is
# on — and a targeted fetch RECOVERS the common case that used to be
# unrecoverable. But a refspec fetch (`+refs/heads/*:refs/remotes/origin/*`)
# never can: measured, it leaves the orphan ABSENT, because a dangling commit is
# by definition reachable from no branch. Fetch depth was never the problem.
#
# That is why both paths below are required. The targeted fetch rescues most
# pointers; the refusal still has to exist for an object GitHub has actually
# garbage-collected, and for the case where we cannot see the remote at all.
#
# End-to-end, against the real remote: the very pointer that made the sibling
# gate refuse in bsuite#1988 —
#
#   FATAL: cannot diff R80.4 98961198..b63f4dac — the submodule clone is
#          missing one of those commits
#
# was replayed here from a FRESH clone that genuinely lacked it, recovered by the
# targeted fetch, and correctly gated its 1 migration. So this selector is
# strictly better than both the warning it replaces AND the sibling's hard
# refusal: the scope actually gets examined. check-migration-floor.py still
# refuses on that recoverable input and could adopt the same recovery step —
# reported to bsuite#1966 rather than changed here.
#
# TELLING THE TWO CAUSES APART, WITHOUT PARSING ERROR TEXT
# ───────────────────────────────────────────────────────
# They need different operator responses, so conflating them sends whoever reads
# the log down the wrong path:
#
#   * NOT FETCHED     — we could not reach the remote. The object's existence is
#                       UNKNOWN. Remedy: fix the credential (BSUITE_CROSS_REPO_PAT).
#   * DOES NOT EXIST  — we reached the remote fine, asked for the object, and
#                       still do not have it. Remedy: re-point the gitlink at the
#                       post-rebase SHA.
#
# The discriminator is a positive control, not a string match on git's wording:
# `git ls-remote origin HEAD`. If that succeeds, credentials and connectivity are
# PROVEN good, so a still-absent object is genuinely absent on the remote. If it
# fails, we are blind and say so. This keeps the classification transport-
# agnostic, which is also what lets `--self-test` reproduce both verdicts against
# local bare repositories with no network.
#
# NOTE ON CREDENTIALS
# ───────────────────
# The workflow checks out with `persist-credentials: false`, which strips the
# auth header from every submodule config. Without re-supplying it, the targeted
# fetch below would fail as an AUTH error for all six private submodules, every
# classification would collapse to "not fetched", and every promotion PR would go
# spuriously red. SUBMODULE_TOKEN is therefore passed in by the caller and used
# only for the recovery fetch and the reachability probe.

set -euo pipefail

SUBMODULES=${SUBMODULES:-"crm7 R80.4 braden business-suite-unified conduit throughput"}

log() { printf '%s\n' "$*" >&2; }

# Build the auth arguments once. Empty when no token is supplied (local runs
# against already-fetched clones, and the --self-test's local bare repos).
_auth_args=()
_set_auth() {
  _auth_args=()
  if [ -n "${SUBMODULE_TOKEN:-}" ]; then
    local b64
    b64=$(printf 'x-access-token:%s' "$SUBMODULE_TOKEN" | base64 -w0)
    _auth_args=(-c "http.extraheader=AUTHORIZATION: basic ${b64}")
  fi
}

have_commit() { git -C "$1" cat-file -e "${2}^{commit}" 2>/dev/null; }

# Targeted bare-SHA fetch. GitHub serves dangling objects this way; a refspec
# fetch cannot. Allowed to fail — the caller re-checks presence rather than
# trusting the exit code, because transports differ in how they refuse.
fetch_commit() {
  local dir=$1 sha=$2
  git -C "$dir" "${_auth_args[@]}" fetch -q --no-tags origin "$sha" >/dev/null 2>&1 || true
}

# The positive control that separates "blind" from "genuinely missing".
remote_reachable() {
  local dir=$1
  git -C "$dir" "${_auth_args[@]}" ls-remote origin HEAD >/dev/null 2>&1
}

# Emit every *.sql under supabase/migrations that differs between two commits
# of a submodule, prefixed with the submodule directory.
diff_scope() {
  local dir=$1 old=$2 new=$3 n=0 f
  while IFS= read -r f; do
    case "$f" in
      supabase/migrations/*.sql) printf '%s/%s\n' "$dir" "$f"; n=$((n + 1)) ;;
    esac
  done < <(git -C "$dir" diff --name-only "$old" "$new")
  log "  $dir: pointer ${old:0:8}..${new:0:8} diffed — $n migration(s) gated"
}

resolve() {
  local base_sha=$1 head_sha=$2
  local dir old new f missing sha

  _set_auth

  # 1. Files changed directly in the parent tree.
  while IFS= read -r f; do
    case "$f" in
      *supabase/migrations/*.sql) printf '%s\n' "$f" ;;
    esac
  done < <(git diff --name-only "$base_sha" "$head_sha")

  # 2. Migrations changed inside each submodule whose gitlink moved.
  for dir in $SUBMODULES; do
    # --verify --quiet, not a bare rev-parse: without it an unresolvable
    # `<sha>:<path>` echoes the COMMIT sha back, so a submodule absent from one
    # side reads as a moved pointer carrying a bogus value.
    old=$(git rev-parse --verify --quiet "${base_sha}:${dir}" 2>/dev/null || true)
    new=$(git rev-parse --verify --quiet "${head_sha}:${dir}" 2>/dev/null || true)

    # Absent on one side = the submodule was added or removed by this PR. That
    # is a DIFFERENT hole and is reported separately (bsuite#1966); it is not
    # the undiffable-pointer defect this script closes.
    [ -n "$old" ] && [ -n "$new" ] || continue
    [ "$old" != "$new" ] || continue

    if have_commit "$dir" "$old" && have_commit "$dir" "$new"; then
      diff_scope "$dir" "$old" "$new"
      continue
    fi

    # TRY HARDER BEFORE GIVING UP.
    log "  $dir: pointer ${old:0:8}..${new:0:8} moved but not both commits are present — attempting targeted fetch"
    for sha in "$old" "$new"; do
      have_commit "$dir" "$sha" || fetch_commit "$dir" "$sha"
    done

    if have_commit "$dir" "$old" && have_commit "$dir" "$new"; then
      log "  $dir: recovered by targeted fetch"
      diff_scope "$dir" "$old" "$new"
      continue
    fi

    # STILL UNRESOLVABLE. Classify, then refuse.
    missing=""
    for sha in "$old" "$new"; do
      have_commit "$dir" "$sha" || missing="${missing} ${sha:0:8}"
    done

    log ""
    if remote_reachable "$dir"; then
      log "::error::FATAL: cannot diff $dir ${old:0:8}..${new:0:8} —${missing} DOES NOT EXIST ON THE REMOTE."
      log "       The remote answered (ls-remote succeeded), the object was requested by SHA, and it is"
      log "       still not here. This is an orphaned pointer, not a fetch problem: $dir lands PRs by"
      log "       rebase (required_linear_history), which rewrites SHAs, and this parent commit pins one"
      log "       the rebase discarded."
      log "       REMEDY: re-point the gitlink at the post-rebase commit —"
      log "         git -C $dir fetch origin && git -C $dir rev-parse origin/<branch>"
      log "         git add $dir && git commit"
      log "       Do NOT retry the job and do NOT fetch deeper; neither can conjure a commit that is gone."
    else
      log "::error::FATAL: cannot diff $dir ${old:0:8}..${new:0:8} —${missing} WAS NOT FETCHED."
      log "       The remote could not be reached at all (ls-remote failed), so whether these commits"
      log "       exist is UNKNOWN. This is a credential or connectivity problem, not a bad pointer."
      log "       REMEDY: check the BSUITE_CROSS_REPO_PAT secret (Contents: read on each app repo) and"
      log "       that SUBMODULE_TOKEN reaches this step — see bsuite#1781."
    fi
    log ""
    log "       Refusing to pass on a scope that was not examined."
    return 1
  done
}

# ── negative control ────────────────────────────────────────────────────────
# Plants an undiffable pointer and requires the refusal; plants a diffable one
# and requires the list. A guard never seen to fail is not a guard.
self_test() {
  local root rc out status=0
  root=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '$root'" RETURN

  export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

  # A bare "remote" for the submodule, and a working clone of it.
  #
  # allowAnySHA1InWant models github.com, where it is ON — measured 2026-08-13
  # with a three-way control (see the header table). Without setting it here the
  # recovery control below would fail against a local bare repo for a reason
  # that does not exist on the real remote, which would make the harness lie
  # about the very behaviour it is supposed to prove.
  git init -q --bare "$root/sub.git"
  git -C "$root/sub.git" config uploadpack.allowAnySHA1InWant true

  git init -q "$root/subwork"
  git -C "$root/subwork" remote add origin "$root/sub.git"
  mkdir -p "$root/subwork/supabase/migrations"

  echo "select 1;" > "$root/subwork/supabase/migrations/20260812000000_one.sql"
  git -C "$root/subwork" add -A && git -C "$root/subwork" commit -qm one
  local SHA_OLD; SHA_OLD=$(git -C "$root/subwork" rev-parse HEAD)
  git -C "$root/subwork" push -q origin HEAD:refs/heads/main

  # Cloned while the remote knows only SHA_OLD. This clone therefore LACKS
  # SHA_NEW the way a CI checkout lacks a commit pushed after it started — the
  # genuinely recoverable case.
  git clone -q "$root/sub.git" "$root/clone_old"

  echo "select 2;" > "$root/subwork/supabase/migrations/20260812000001_two.sql"
  git -C "$root/subwork" add -A && git -C "$root/subwork" commit -qm two
  local SHA_NEW; SHA_NEW=$(git -C "$root/subwork" rev-parse HEAD)
  git -C "$root/subwork" push -q origin HEAD:refs/heads/main

  # A commit that the remote never receives, then discarded locally: the
  # orphan. Nothing can resolve it, which is exactly the case under test.
  echo "select 3;" > "$root/subwork/supabase/migrations/20260812000002_three.sql"
  git -C "$root/subwork" add -A && git -C "$root/subwork" commit -qm three
  local SHA_ORPHAN; SHA_ORPHAN=$(git -C "$root/subwork" rev-parse HEAD)
  git -C "$root/subwork" reset -q --hard "$SHA_NEW"
  git -C "$root/subwork" reflog expire --expire=now --all
  git -C "$root/subwork" gc -q --prune=now 2>/dev/null || true

  # A parent carrying the submodule as a real gitlink, over a given clone.
  make_parent() {
    local pdir=$1 src=$2
    git init -q "$pdir"
    ( cd "$pdir"
      cp -r "$src" "$pdir/R80.4"
      printf '[submodule "R80.4"]\n\tpath = R80.4\n\turl = %s/sub.git\n' "$root" > .gitmodules
      git add .gitmodules
      git update-index --add --cacheinfo "160000,$SHA_OLD,R80.4"
      git commit -qm base
      git update-index --cacheinfo "160000,$SHA_NEW,R80.4"
      git commit -qm advance
      git update-index --cacheinfo "160000,$SHA_ORPHAN,R80.4"
      git commit -qm orphan ) >/dev/null
  }

  make_parent "$root/parent" "$root/subwork"
  make_parent "$root/parent_stale" "$root/clone_old"

  local P_BASE P_GOOD P_BAD
  P_BASE=$(git -C "$root/parent" rev-parse HEAD~2)
  P_GOOD=$(git -C "$root/parent" rev-parse HEAD~1)
  P_BAD=$(git -C "$root/parent" rev-parse HEAD)

  echo "── negative control 1: a RESOLVABLE pointer must pass and gate the change ──"
  set +e
  out=$( cd "$root/parent" && SUBMODULES=R80.4 SUBMODULE_TOKEN= bash "$SELF" --changed "$P_BASE" "$P_GOOD" 2>&1 )
  rc=$?
  set -e
  printf '%s\n' "$out" | sed 's/^/    /'
  if [ $rc -eq 0 ] && printf '%s' "$out" | grep -q '20260812000001_two.sql'; then
    echo "  PASS: exited 0 and gated the migration the pointer introduced"
  else
    echo "  FAIL: expected exit 0 with the new migration gated, got rc=$rc"; status=1
  fi

  echo
  echo "── negative control 2: a pointer missing LOCALLY but present on the remote must be RECOVERED ──"
  local S_BASE S_GOOD
  S_BASE=$(git -C "$root/parent_stale" rev-parse HEAD~2)
  S_GOOD=$(git -C "$root/parent_stale" rev-parse HEAD~1)
  set +e
  out=$( cd "$root/parent_stale" && SUBMODULES=R80.4 SUBMODULE_TOKEN= bash "$SELF" --changed "$S_BASE" "$S_GOOD" 2>&1 )
  rc=$?
  set -e
  printf '%s\n' "$out" | sed 's/^/    /'
  if [ $rc -eq 0 ] && printf '%s' "$out" | grep -q 'recovered by targeted fetch'; then
    echo "  PASS: the targeted fetch resolved it — trying harder works, and is not theatre"
  else
    echo "  FAIL: expected recovery via targeted fetch, got rc=$rc"; status=1
  fi

  echo
  echo "── negative control 3: an ORPHANED pointer must FAIL CLOSED ──"
  set +e
  out=$( cd "$root/parent" && SUBMODULES=R80.4 SUBMODULE_TOKEN= bash "$SELF" --changed "$P_GOOD" "$P_BAD" 2>&1 )
  rc=$?
  set -e
  printf '%s\n' "$out" | sed 's/^/    /'
  if [ $rc -ne 0 ] && printf '%s' "$out" | grep -q 'DOES NOT EXIST ON THE REMOTE'; then
    echo "  PASS: refused, and named the cause as an orphaned pointer"
  else
    echo "  FAIL: expected a non-zero exit naming the orphan, got rc=$rc"; status=1
  fi

  echo
  echo "── negative control 4: an UNREACHABLE remote must fail with the OTHER cause ──"
  git -C "$root/parent/R80.4" remote set-url origin "$root/does-not-exist.git"
  set +e
  out=$( cd "$root/parent" && SUBMODULES=R80.4 SUBMODULE_TOKEN= bash "$SELF" --changed "$P_GOOD" "$P_BAD" 2>&1 )
  rc=$?
  set -e
  printf '%s\n' "$out" | sed 's/^/    /'
  if [ $rc -ne 0 ] && printf '%s' "$out" | grep -q 'WAS NOT FETCHED'; then
    echo "  PASS: refused, and distinguished it from the orphaned case"
  else
    echo "  FAIL: expected a non-zero exit naming the fetch failure, got rc=$rc"; status=1
  fi

  echo
  if [ $status -eq 0 ]; then
    echo "SELF-TEST PASSED — the selector was seen to pass once and fail twice, for two different reasons."
  else
    echo "SELF-TEST FAILED — the selector cannot be trusted to gate anything."
  fi
  return $status
}

SELF=$(readlink -f "${BASH_SOURCE[0]}")

case "${1:-}" in
  --changed)
    [ $# -eq 3 ] || { log "usage: $0 --changed <base_sha> <head_sha>"; exit 2; }
    resolve "$2" "$3"
    ;;
  --self-test)
    self_test
    ;;
  *)
    log "usage: $0 --changed <base_sha> <head_sha> | --self-test"
    exit 2
    ;;
esac
