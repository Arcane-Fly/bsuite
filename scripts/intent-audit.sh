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
#    A PROMOTION IS NOT A LANE. development->main coexisting with a feature PR is
#    the pipeline working, not a budget breach — the first version of this check
#    flagged exactly that and was wrong. Count only PRs targeting `development`.
for r in crm7 business-suite-unified conduit braden throughput R80.4; do
  n=$(gh pr list --repo "GaryOcean428/$r" --state open --base development --json number --jq 'length' 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 1 ] && flag "$r has $n open feature PRs into development (lane budget: 1)"
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

# 8. LOCAL MEMORY — an overnight run that OOMs is a dead run --------------------
#    Operator, 22:29: "keep an eye on local memory and check for anything eating
#    it that isn't needed. only vscode is currently open."
#
#    THE HAZARD IS KILLING THE WRONG THING. Earlier tonight a loose pattern nearly
#    took Braden's own Chrome, and the overnight lanes run INSIDE VS Code — the
#    same binary as this audit. So this section REPORTS candidates and refuses to
#    kill anything itself. Tracing ancestry to a session is a judgement call; a
#    cron job should not be making it unattended.
AVAIL=$(free -m | awk 'NR==2{print $7}')
SWAP=$(free -m | awk 'NR==3{print $3}')
say "memory: ${AVAIL}MB available, ${SWAP}MB swap in use"
[ "${AVAIL:-99999}" -lt 4096 ] && flag "only ${AVAIL}MB available — lanes will start failing"
[ "${SWAP:-0}" -gt 16384 ] && flag "${SWAP}MB swap in use — sustained memory pressure"

#    Candidates = NOT under VS Code and NOT this estate's own tooling.
#    AGE IS NOT ORPHANHOOD, and the first version of this check proved it the
#    hard way: it flagged 3 "day-old orphaned browsers" that were the LIVE
#    @playwright/mcp servers for this session and the overnight run. Killing them
#    would have broken the visual gate for the whole night. A long-lived process
#    under a live session is a long-lived process, not a leak.
#
#    So: walk each candidate's ancestry. If it reaches a running `claude` under
#    VS Code, it belongs to somebody and is NOT a candidate.
owned_by_live_session() {
  local pid=$1 i
  for i in 1 2 3 4 5 6; do
    [ -z "$pid" ] || [ "$pid" -le 1 ] 2>/dev/null && return 1
    case "$(ps -o args= -p "$pid" 2>/dev/null)" in
      *.vscode/extensions/anthropic.claude-code*) return 0 ;;
      */usr/share/code/code*)                     return 0 ;;
    esac
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
  done
  return 1
}

ORPH=0
for pid in $(pgrep -f 'claude-desktop' 2>/dev/null); do
  owned_by_live_session "$pid" || ORPH=$((ORPH+1))
done
[ "$ORPH" -gt 0 ] && flag "$ORPH claude-desktop process(es) running — the operator closed it; it is not meant to run"

STALEPW=0
for pid in $(pgrep -f 'chrome-headless|playwright-mcp' 2>/dev/null); do
  owned_by_live_session "$pid" && continue
  age=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ')
  case "$age" in *-*) STALEPW=$((STALEPW+1)) ;; esac
done
[ "$STALEPW" -gt 0 ] && flag "$STALEPW headless-browser process(es) >1 day old AND not owned by a live session — genuinely orphaned"

# 9. Named, not skipped ------------------------------------------------------
say "NOT checked here (needs Supabase MCP, run them in-session):"
say "  · FutureBuild row counts — 8 placements / 8 people / 8 training_contracts / 13 contacts / 3 timesheets / 5 clients / 0 incidents / 0 reminders (clients+incidents+reminders ADDED to the watch 2026-08-25: the E2E incident polluted 3 tables this list did not cover)"
say "  · advisor sweep ERROR count"
say "NOT checked here (needs the lane transcripts): lane liveness"

echo "──"
if [ "$DEV" -eq 0 ]; then
  echo "  CLEAN — no deviations."
else
  echo "  $DEV deviation(s) above."
fi
exit 0
