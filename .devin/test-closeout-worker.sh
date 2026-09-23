#!/usr/bin/env bash
# Regression test for .devin/closeout-worker.sh transport.
# Uses a fixture copy with only the devin executable and the timeout
# limit replaced by stub values; asserts model, smart permission mode,
# single-argv prompt, nonzero/timeout propagation, and that no other
# provider CLI is referenced.
set -uo pipefail
SRC=/home/braden/Desktop/Dev/bsuite/.devin/closeout-worker.sh
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "ok - $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL - $1"; }

# 1. shell syntax of the real script
bash -n "$SRC" && ok "bash -n $SRC" || bad "bash -n $SRC"

# 2. no other provider CLI referenced anywhere in the transport
if grep -nE 'hermes|ollama|openrouter|claude |qwen|codex|agy' "$SRC"; then
  bad "foreign provider reference found"
else
  ok "no foreign provider reference"
fi

# 3. build fixture: stub devin records argv; timeout limit -> 2s
STUB="$TMP/devin-stub.sh"
cat > "$STUB" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$ARGV_OUT"
printf '%s' "${BSU_CLOSEOUT_CHILD:-unset}" > "$CHILD_OUT"
if [ -t 0 ]; then echo tty > "$STDIN_OUT"; else echo notty > "$STDIN_OUT"; fi
exit "${STUB_EXIT:-0}"
EOF
chmod +x "$STUB"
FIX="$TMP/worker.sh"
sed -e "s|/home/braden/.local/bin/devin|$STUB|" -e 's| 5400 | 2 |' "$SRC" > "$FIX"
chmod +x "$FIX"
grep -q ' 2 ' "$FIX" && grep -q "$STUB" "$FIX" && ok "fixture substitutions applied" || bad "fixture substitutions applied"

# 4. happy path: model, smart mode, prompt is a single argv
export ARGV_OUT="$TMP/argv.txt"
export CHILD_OUT="$TMP/child.txt"
export STDIN_OUT="$TMP/stdin.txt"
"$FIX" 'prompt one two   three' "$TMP/run.log"; rc=$?
[ "$rc" -eq 0 ] && ok "happy-path exit 0" || bad "happy-path exit 0 (got $rc)"
mapfile -t A < "$ARGV_OUT"
[ "${A[0]:-}" = "--model" ] && [ "${A[1]:-}" = "gpt-5-6-sol-medium" ] \
  && ok "model gpt-5-6-sol-medium" || bad "model argv: ${A[*]:-none}"
[ "${A[2]:-}" = "--permission-mode" ] && [ "${A[3]:-}" = "smart" ] \
  && ok "permission-mode smart" || bad "permission argv: ${A[*]:-none}"
[ "${A[4]:-}" = "-p" ] && [ "${A[5]:-}" = 'prompt one two   three' ] && [ "${#A[@]}" -eq 6 ] \
  && ok "prompt passed as single argv" || bad "prompt argv: ${A[*]:-none}"
[ "$(cat "$CHILD_OUT")" = "1" ] && ok "BSU_CLOSEOUT_CHILD=1 in child env" || bad "BSU_CLOSEOUT_CHILD=$(cat "$CHILD_OUT")"
[ "$(cat "$STDIN_OUT")" = "notty" ] && ok "child stdin is not a tty" || bad "child stdin tty state: $(cat "$STDIN_OUT" 2>/dev/null)"
[ -f "$TMP/run.log" ] && ok "log file created" || bad "log file created"

# 4b. accountability-master propagates helper failure
MHELPER="$TMP/helper-fail.sh"
printf '#!/usr/bin/env bash\nexit 9\n' > "$MHELPER"; chmod +x "$MHELPER"
MFIX="$TMP/master.sh"
sed "s|/home/braden/Desktop/Dev/bsuite/.devin/closeout-worker.sh|$MHELPER|" \
  /home/braden/.agents/hooks/bsuite-accountability-master-hook.sh > "$MFIX"
bash "$MFIX" "$TMP/mlog" >/dev/null 2>&1; rc=$?
[ "$rc" -eq 9 ] && ok "master propagates helper failure (9)" || bad "master propagation (got $rc)"

# 5. nonzero propagation
STUB_EXIT=7 "$FIX" 'p' "$TMP/run2.log"; rc=$?
[ "$rc" -eq 7 ] && ok "nonzero stub exit propagates (7)" || bad "nonzero propagation (got $rc)"

# 6. timeout propagation: stub sleeps beyond 2s limit
cat > "$STUB" <<'EOF'
#!/usr/bin/env bash
sleep 10
EOF
"$FIX" 'p' "$TMP/run3.log"; rc=$?
{ [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ] || [ "$rc" -eq 143 ]; } \
  && ok "timeout propagated (rc=$rc)" || bad "timeout propagation (got $rc)"

echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
