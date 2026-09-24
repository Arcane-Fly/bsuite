---
kind: record
authority: none
owner: bsuite
---

# The reach loop reports green when the regeneration is killed by a signal: the consumer tests for 1, not for failure

https://github.com/GaryOcean428/bsuite/issues/3095

Snapshot updatedAt: 2026-09-05T10:34:47Z. Open at capture; re-read live.

Found by mutation during the PI-run enforcer gate on bsuite#3092 (evidence `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-05/enforcer-bsuite-3092-evidence.md`). Pre-existing; #3092 narrows the class but does not close this part of it.

The reach loop's consumer is `if [ "$rc" = "1" ]` (`.github/workflows/consumer-lockfile-reach.yml:198`) — **only a `1` fails the job**. #3092 fixes the case where a `1` was masked by an earlier non-zero, which was a live green-on-failure hole: `[137, 1]` used to leave `rc=137` and the step went green while a lockfile had genuinely failed verification.

What remains: a **lone** non-1 failure still reports green. If the regeneration is killed by a signal (137 from an out-of-memory kill, or 143 from a job timeout) and nothing else fails, `rc=137`, the consumer's equality test is false, and the step passes. A killed regeneration is indistinguishable from a successful one.

The fix is to make the consumer test for success rather than for one specific failure — `if [ "$rc" != "0" ]` — which requires first confirming that no path deliberately returns a non-zero meaning "nothing to do". From the enforcer's trace: `2` (`WOULD-CHANGE`) is set only when `!write`, and both callers here pass `--write`, so `2` is unreachable on this path; that should be re-verified rather than assumed when the change is made, because it is exactly the kind of assumption that goes stale.

Whoever takes this should add a vector to `scripts/test-reach-rc-precedence.sh` covering a lone `137`, so the gap cannot reopen silently.
