#!/usr/bin/env bash
# The 30-minute owner audit. Reports DEVIATIONS ONLY.
#
# Held against docs/20260825-operator-intent-lock-v1.00A.md.
#
# DESIGN CONSTRAINT: this must finish in seconds. An audit that takes twenty
# minutes cannot run every thirty, and one that nobody runs is a document, not a
# control. Everything here is local git + gh; the two checks that need the
# Supabase MCP are NAMED rather than silently skipped, because a gate that cannot
# tell "checked nothing" from "found nothing" is not a gate.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

REPOS=(. crm7 business-suite-unified conduit braden throughput R80.4)
DEV=0   # deviation count

say()  { printf '  %s\n' "$*"; }
flag() { printf '  DEVIATION: %s\n' "$*"; DEV=$((DEV+1)); }

echo "── intent audit $(TZ=Australia/Perth date '+%Y-%m-%d %H:%M %Z') ──"

# 1. Freeze window -----------------------------------------------------------
#    A MISSING GUARD MUST NOT LOOK LIKE A FREEZE. The first run of this script
#    called prod-window.sh from a branch that did not carry it, the call failed,
#    and this line printed "FROZEN" — a definite answer from a check that never
#    ran. Fail closed, yes; but say WHY, or the audit lies in the safe direction
#    and nobody can tell a real freeze from a broken path.
if [ ! -x ./scripts/prod-window.sh ]; then
  WIN="UNKNOWN"
  flag "prod-window.sh not found or not executable — treating prod as FROZEN, but this is NOT a real freeze verdict"
elif ./scripts/prod-window.sh --quiet; then
  WIN="OPEN"
else
  WIN="FROZEN"
fi
say "prod window: $WIN"

# 2. Estate shape ------------------------------------------------------------
WT=$(git worktree list | wc -l)
[ "$WT" -gt 1 ] && flag "$WT worktrees (baseline 1) — cleanup skipped?"

BR=0
for r in "${REPOS[@]}"; do
  n=$(git -C "$r" for-each-ref --format='%(refname)' refs/remotes/origin 2>/dev/null | grep -vc HEAD)
  BR=$((BR+n))
done
say "remote branches: $BR   worktrees: $WT"
[ "$BR" -gt 26 ] && flag "$BR remote branches — branch budget drifting (one open PR per lane)"

# 3. Repos on development and in sync ---------------------------------------
for r in "${REPOS[@]}"; do
  name=$(basename "$(cd "$r" && pwd)")
  b=$(git -C "$r" branch --show-current 2>/dev/null)
  #    The OWNER works on a feature branch legitimately; a lane leaving its repo
  #    parked on one is the drift worth catching. Both look identical from here,
  #    so this reports rather than accuses.
  [ "$b" = "development" ] || say "note: $name is on '$b' (expected if a lane is mid-PR)"
done

# 4. Behaviour checks on what landed on development in the last 6 hours ------
#    B2 empty catch  ·  B5 new TODO  ·  scoped to TONIGHT's diffs only, because
#    pre-existing debt is reported elsewhere and must not drown the signal.
SINCE="6 hours ago"
for r in "${REPOS[@]}"; do
  name=$(basename "$(cd "$r" && pwd)")
  base=$(git -C "$r" log --since="$SINCE" --format=%H origin/development 2>/dev/null | tail -1)
  [ -z "$base" ] && continue
  d=$(git -C "$r" diff "$base^..origin/development" -- '*.ts' '*.tsx' 2>/dev/null)
  [ -z "$d" ] && continue
  # B5 — a TODO added tonight
  t=$(printf '%s' "$d" | grep -cE '^\+.*(TODO|FIXME|XXX|HACK)\b')
  [ "$t" -gt 0 ] && flag "B5 $name: $t new TODO/FIXME/XXX/HACK in tonight's diff"
  # B2 — an empty catch added tonight
  c=$(printf '%s' "$d" | grep -cE '^\+.*catch[^{]*\{\s*\}')
  [ "$c" -gt 0 ] && flag "B2 $name: $c empty catch block(s) added"
done

# 5. Open PRs ----------------------------------------------------------------
#    The budget is one open PR PER LANE, and the parent repo hosts several lanes
#    (theme, docs, ops), so a flat "more than one is a violation" would cry wolf
#    on the parent every sweep and train the reader to ignore it. Submodules are
#    one lane each; the parent gets headroom and is only flagged when it is
#    clearly accumulating.
for r in crm7 business-suite-unified conduit braden throughput R80.4; do
  n=$(gh pr list --repo "GaryOcean428/$r" --state open --json number --jq 'length' 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 1 ] && flag "$r has $n open PRs (submodule budget: 1)"
done
np=$(gh pr list --repo GaryOcean428/bsuite --state open --json number --jq 'length' 2>/dev/null || echo 0)
say "parent open PRs: $np (multi-lane; flagged above 4)"
[ "${np:-0}" -gt 4 ] && flag "parent has $np open PRs — lanes are accumulating, not landing"

# 6. Named, not skipped ------------------------------------------------------
say "NOT checked here (needs Supabase MCP, run them in-session):"
say "  · FutureBuild row counts — 8 placements / 8 people / 8 training_contracts / 13 contacts / 3 timesheets"
say "  · advisor sweep ERROR count"
say "NOT checked here (needs the lane transcripts): lane liveness"

echo "──"
if [ "$DEV" -eq 0 ]; then
  echo "  CLEAN — no deviations."
else
  echo "  $DEV deviation(s) above."
fi
exit 0
