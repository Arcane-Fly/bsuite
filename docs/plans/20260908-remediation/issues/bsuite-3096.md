# Nothing asserts the CI retry bracket stays: a gate should parse the workflows for retry blocks missing set +e / set -e

https://github.com/GaryOcean428/bsuite/issues/3096

Snapshot updatedAt: 2026-09-05T11:40:18Z. Open at capture; re-read live.

Raised by the PI-run enforcer re-gating bsuite#3091 / crm7#2438 (evidence `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-05/enforcer-bsuite-3091-evidence.md`, residual R3).

Those two PRs fixed a class where every retry loop in the estate was inert: GitHub runs each `run:` block under `bash -e {0}`, `set -uo pipefail` does not clear the inherited `-e`, and a failing pipeline exits the step before `rc=${PIPESTATUS[0]}` can be read. 22 of 24 steps never retried. The fix brackets each guarded pipeline with `set +e` … `set -e`.

**Nothing durably asserts that the bracket stays.** The self-test committed with the fix embeds its own copies of the skeleton and never reads the real workflow YAML, and it is paths-filtered to itself — so deleting the bracket from any of the 23 blocks leaves every check green. The class can silently reopen one edit at a time, and its symptom is invisible: the workflows keep passing, because they pass whenever the registry does not drop.

**What would close it:** a gate that parses `.github/workflows/*.yml`, finds every block containing a retry loop (`max_attempts`, or the retry function's own marker), and fails if that block does not bracket its guarded pipeline with `set +e` / `set -e`. It should also assert it can fail — plant a block without the bracket in a fixture and require the gate to catch it — because a gate that cannot demonstrate catching its own case is the thing this whole class is about.

Worth doing because this is the second time the estate has shipped a guard whose own protection was unverifiable, and because the failure mode here is a green build that retried nothing.

