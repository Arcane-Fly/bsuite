#!/usr/bin/env bash
# FOLLOW 113 bite: proves the retry skeleton used in every fixed
# .github/workflows/*.yml step actually survives the runner's own shell
# invocation, not just a plain local `bash script.sh`.
#
# GitHub Actions runs a `run:` step with `shell: bash` (explicit or default
# on ubuntu-latest) as:
#     bash --noprofile --norc -eo pipefail {0}
# i.e. errexit AND pipefail are already active from the shell's OWN
# invocation flags before a single line of the step's script runs. A `set
# -uo pipefail` inside the script does not clear the inherited `-e` — only
# an explicit `set +e` does. Without that, a failing `cmd1 && cmd2 2>&1 |
# tee "$log"` (cmd2/pipe is the LAST element of the && list, so it is NOT
# protected by errexit's own-command-in-&&-list exemption) kills the step
# before `rc=${PIPESTATUS[0]}` is ever read — the retry loop below it never
# executes. This was shipped once already and caught in review by replaying
# the exact block under `bash -e`.
#
# This script runs the retry skeleton under THREE invocations:
#   1. plain `bash` (no -e)                     — the wrong test to trust
#   2. `bash -e {0}`                             — what a bare `shell: bash`-less run gets
#   3. `bash --noprofile --norc -eo pipefail {0}` — the exact runner default
# and asserts the outcome is IDENTICAL in all three: the transient-network
# case recovers within the bounded attempt count, and the genuine-failure
# case fails immediately with no retry.
set -uo pipefail


make_case_script() {
  # $1 = output path, $2 = "transient" | "genuine"
  local path="$1" kind="$2"
  if [ "$kind" = "transient" ]; then
    cat > "$path" << 'EOS'
set -uo pipefail
attempt=1
max_attempts=4
delay=0
network_pattern='ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|getaddrinfo|ERR_SOCKET_TIMEOUT|socket disconnected|fetch failed|ERR_PNPM_META_FETCH_FAIL|ERR_PNPM_FETCH_FAIL|Error when performing the request to https://registry'
log="$(mktemp)"
STATE_FILE="$(mktemp)"
echo 0 > "$STATE_FILE"
while true; do
  echo "::group::install attempt ${attempt}/${max_attempts}"
  set +e
  bash -c '
    n=$(cat "'"$STATE_FILE"'"); n=$((n+1)); echo $n > "'"$STATE_FILE"'";
    if [ "$n" -lt 3 ]; then
      echo "Error when performing the request to https://registry.npmjs.org/pnpm/-/pnpm-10.33.3.tgz";
      echo "[cause]: Client network socket disconnected before secure TLS connection was established { code: ECONNRESET }";
      exit 1;
    else
      echo "corepack: pnpm@10.33.3 activated";
      exit 0;
    fi' 2>&1 | tee "$log"
  rc=${PIPESTATUS[0]}
  set -e
  echo "::endgroup::"
  [ "$rc" -eq 0 ] && break
  if [ "$attempt" -ge "$max_attempts" ] || ! grep -qE "$network_pattern" "$log"; then
    echo "RESULT: gave up (rc=$rc) after ${attempt} attempt(s)"
    rm -f "$log" "$STATE_FILE"
    exit "$rc"
  fi
  echo "RESULT-SO-FAR: attempt ${attempt} retryable, retrying"
  attempt=$((attempt + 1))
done
rm -f "$log" "$STATE_FILE"
echo "RESULT: recovered after ${attempt} attempt(s)"
EOS
  else
    cat > "$path" << 'EOS'
set -uo pipefail
attempt=1
max_attempts=4
delay=0
network_pattern='ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|getaddrinfo|ERR_SOCKET_TIMEOUT|socket disconnected|fetch failed|ERR_PNPM_META_FETCH_FAIL|ERR_PNPM_FETCH_FAIL|Error when performing the request to https://registry'
log="$(mktemp)"
while true; do
  echo "::group::install attempt ${attempt}/${max_attempts}"
  set +e
  bash -c 'echo " ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with \"frozen-lockfile\" because pnpm-lock.yaml is not up to date with package.json"; exit 1' 2>&1 | tee "$log"
  rc=${PIPESTATUS[0]}
  set -e
  echo "::endgroup::"
  [ "$rc" -eq 0 ] && break
  if [ "$attempt" -ge "$max_attempts" ] || ! grep -qE "$network_pattern" "$log"; then
    echo "RESULT: gave up (rc=$rc) after ${attempt} attempt(s)"
    rm -f "$log"
    exit "$rc"
  fi
  echo "RESULT-SO-FAR: attempt ${attempt} retryable, retrying"
  attempt=$((attempt + 1))
done
rm -f "$log"
echo "RESULT: recovered after ${attempt} attempt(s)"
EOS
  fi
}

TRANSIENT_SCRIPT="$(mktemp)"
GENUINE_SCRIPT="$(mktemp)"
make_case_script "$TRANSIENT_SCRIPT" transient
make_case_script "$GENUINE_SCRIPT" genuine

PASS=1

run_under() {
  local shell_desc="$1"; shift
  local script="$1"; shift
  local expect_recover="$1"; shift  # 1 = expect exit 0 with "recovered", 0 = expect nonzero with "gave up"

  echo "----- under: $shell_desc -----"
  local out rc
  out=$("$@" "$script" 2>&1)
  rc=$?
  # multi-line $out; parameter expansion cannot indent every line at once
  # shellcheck disable=SC2001
  echo "$out" | sed 's/^/    /'
  echo "  exit code: $rc"

  if [ "$expect_recover" -eq 1 ]; then
    if [ "$rc" -eq 0 ] && echo "$out" | grep -q "RESULT: recovered after 3 attempt(s)"; then
      echo "  PASS: recovered after exactly 3 attempts, as designed"
    else
      echo "  FAIL: expected recovery after 3 attempts, got rc=$rc"
      PASS=0
    fi
  else
    if [ "$rc" -ne 0 ] && echo "$out" | grep -q "RESULT: gave up (rc=1) after 1 attempt(s)"; then
      echo "  PASS: failed fast on attempt 1, no retry"
    else
      echo "  FAIL: expected fail-fast on attempt 1, got rc=$rc / output above"
      PASS=0
    fi
  fi
  echo
}

echo "=== Case 1: transient network error (fails twice, then succeeds) ==="
run_under "plain bash (no -e)"                                  "$TRANSIENT_SCRIPT" 1 bash
run_under "bash -e {0}"                                          "$TRANSIENT_SCRIPT" 1 bash -e
run_under "bash --noprofile --norc -eo pipefail {0} (runner default)" "$TRANSIENT_SCRIPT" 1 bash --noprofile --norc -eo pipefail

echo "=== Case 2: genuine (non-network) failure — must fail fast, no retry ==="
run_under "plain bash (no -e)"                                  "$GENUINE_SCRIPT" 0 bash
run_under "bash -e {0}"                                          "$GENUINE_SCRIPT" 0 bash -e
run_under "bash --noprofile --norc -eo pipefail {0} (runner default)" "$GENUINE_SCRIPT" 0 bash --noprofile --norc -eo pipefail

rm -f "$TRANSIENT_SCRIPT" "$GENUINE_SCRIPT"

echo "================================================================"
if [ "$PASS" -eq 1 ]; then
  echo "ALL CASES PASS under all three shell invocations, including the runner's own default."
  exit 0
else
  echo "AT LEAST ONE CASE FAILED — see FAIL lines above."
  exit 1
fi
