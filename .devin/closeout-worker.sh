#!/usr/bin/env bash
set -euo pipefail
PROMPT=${1:?prompt required}
LOG=${2:?log required}
ROOT=/home/braden/Desktop/Dev/bsuite
mkdir -p "$(dirname "$LOG")"
cd "$ROOT"
export BSU_CLOSEOUT_CHILD=1
export PATH=/home/braden/.local/bin:/usr/local/bin:/usr/bin:/bin
exec setsid --wait timeout --signal=TERM --kill-after=30s 5400 /home/braden/.local/bin/devin --model gpt-5-6-sol-medium --permission-mode smart -p "$PROMPT" </dev/null >> "$LOG" 2>&1
