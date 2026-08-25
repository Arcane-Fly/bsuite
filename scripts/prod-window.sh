#!/usr/bin/env bash
# Is a merge to PRODUCTION (`main`) permitted right now?
#
# OPERATOR DIRECTIVE, 2026-08-25 22:02 AWST:
#   "everything that can be done by 8am merged to prod and tested. no missing
#    placements or UI bugs or functionality bugs permitted on prod. after 8am
#    only merge to development branch until 11am then open again to prod.
#    I have a demo at 9:30 am so i want to give meself time to spot check."
#
# So `main` is FROZEN 08:00–11:00 Australia/Perth. The 09:30 demo sits inside
# that window, and the freeze exists so the operator can spot-check a stable
# production without a lane changing it underneath him.
#
# WHY A SCRIPT AND NOT A LINE IN A DOC. A freeze written only in prose is
# enforced by whoever remembers it at 07:58. This exits non-zero, so it can gate
# a merge in a way that does not depend on anybody's attention.
#
# EXIT CODES
#   0  prod is OPEN      — merges to main permitted
#   1  prod is FROZEN    — development only
#   2  misuse
#
# USAGE
#   scripts/prod-window.sh            # human-readable, exits 0/1
#   scripts/prod-window.sh --quiet    # exit code only
#   scripts/prod-window.sh --at 09:15 # ask about a specific local time (testing)
set -euo pipefail

TZ_NAME="Australia/Perth"
FREEZE_START=8   # 08:00 — prod closes
FREEZE_END=11    # 11:00 — prod reopens

QUIET=0
AT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --quiet) QUIET=1; shift ;;
    --at)    AT="${2:-}"; shift 2 ;;
    *) echo "usage: $0 [--quiet] [--at HH:MM]" >&2; exit 2 ;;
  esac
done

if [ -n "$AT" ]; then
  HOUR=${AT%%:*}; MIN=${AT##*:}
  NOW="$AT (simulated)"
else
  HOUR=$(TZ="$TZ_NAME" date +%-H)
  MIN=$(TZ="$TZ_NAME" date +%M)
  NOW=$(TZ="$TZ_NAME" date '+%Y-%m-%d %H:%M %Z')
fi

# Strip a leading zero so 09 is not read as octal.
HOUR=$((10#$HOUR)); MIN=$((10#$MIN))

if [ "$HOUR" -ge "$FREEZE_START" ] && [ "$HOUR" -lt "$FREEZE_END" ]; then
  if [ "$QUIET" -eq 0 ]; then
    echo "PROD FROZEN — $NOW"
    echo "  main is closed ${FREEZE_START}:00-${FREEZE_END}:00 $TZ_NAME (operator demo 09:30)."
    echo "  Merge to development only. Queue the promotion; do not open it."
  fi
  exit 1
fi

if [ "$QUIET" -eq 0 ]; then
  echo "PROD OPEN — $NOW"
  if [ "$HOUR" -lt "$FREEZE_START" ]; then
    LEFT=$(( (FREEZE_START - HOUR) * 60 - MIN ))
    echo "  ${LEFT} minute(s) until the ${FREEZE_START}:00 freeze."
    echo "  Anything not PROVEN by then must NOT be promoted — a demo is worth more than a merge."
  fi
fi
exit 0
