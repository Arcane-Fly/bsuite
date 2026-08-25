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
#    A RAW COUNT IS THE WRONG MEASURE and cried wolf on its first live run: the
#    baseline of 1 was recorded BEFORE the lanes started, so every legitimate lane
#    worktree read as "cleanup skipped". What actually matters is WHERE they are
#    and whether they are on a real branch — a lane working is not a deviation, a
#    worktree outside the allowed root is.
WT=$(git worktree list | wc -l)
BADWT=$(git worktree list | awk 'NR>1 {print $1}' | grep -vc '^/home/braden/Desktop/Dev/worktrees/' || true)
[ "${BADWT:-0}" -gt 0 ] && flag "$BADWT worktree(s) OUTSIDE ~/Desktop/Dev/worktrees/ — hard rule breach"
DETACHED=$(git worktree list | grep -c 'detached' || true)
[ "${DETACHED:-0}" -gt 0 ] && flag "$DETACHED detached-HEAD worktree(s) — a push there reports up-to-date and lands nothing"

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
#    Open PRs are only a problem if they are STALLING. A lane that opens one and
#    lands it is the system working; the signal is a PR sitting red or untouched,
#    not the count. Flag the OLD ones, not the many.
np=$(gh pr list --repo GaryOcean428/bsuite --state open --json number --jq 'length' 2>/dev/null || echo 0)
say "parent open PRs: $np"
STALLED=$(gh pr list --repo GaryOcean428/bsuite --state open --json number,updatedAt \
  --jq --arg cut "$(date -u -d '90 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" \
  '[.[] | select(.updatedAt < $cut)] | length' 2>/dev/null || echo 0)
[ "${STALLED:-0}" -gt 0 ] && flag "$STALLED parent PR(s) untouched for 90+ min — stalled, not in flight"

# 6. FREEZE BREACH — an OPEN PR into main during the freeze is a breach --------
#    even unmerged. An open promotion invites a merge, and the whole point of the
#    window is that nothing is pending against main while the operator inspects it.
if [ "$WIN" = "FROZEN" ]; then
  for r in bsuite crm7 business-suite-unified conduit braden throughput R80.4; do
    n=$(gh pr list --repo "GaryOcean428/$r" --state open --base main --json number --jq 'length' 2>/dev/null || echo 0)
    [ "${n:-0}" -gt 0 ] && flag "FREEZE BREACH: $r has $n open PR(s) targeting main during the 08:00-11:00 freeze"
  done
fi

# 7. Heartbeats — a lane with a claim and no recent commit is a DEAD CLAIM -----
#    A claim with no heartbeat is not a claim, it is an obstruction: the item
#    looks TAKEN so no other lane picks it up, nothing goes red, and at 07:00 it
#    is exactly where it was at 23:00. 25 minutes is deliberately UNDER one sweep
#    interval so a claim cannot survive two consecutive audits without life.
STALE_MIN=25
say "heartbeats (commits in the last ${STALE_MIN}m, per repo):"
for r in "${REPOS[@]}"; do
  name=$(basename "$(cd "$r" && pwd)")
  n=$(git -C "$r" log --since="${STALE_MIN} minutes ago" --oneline origin/development 2>/dev/null | wc -l)
  printf '    %-24s %s\n' "$name" "$n"
done
say "  -> cross-check against inbox claims: any claimed item whose lane shows 0"
say "     here for two consecutive sweeps is STALE. Reap it (§5b): announce, "
say "     re-dispatch with last known state, re-scope if it has died twice."

# 8. Named, not skipped ------------------------------------------------------
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
