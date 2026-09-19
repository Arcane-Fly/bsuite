# Ruleset dumps — the second protection mechanism, banked

This directory banks the **repository rulesets** that govern default branches across the
estate, beside the classic-protection dumps one level up. It exists because branch
protection here is **two independent mechanisms**: a ruleset edit leaves no diff in the
classic dumps and vice versa, and the 2026-09-07 incident touched both layers in one
window (it lost `non_fast_forward` and `required_linear_history` from the bsuite `default`
ruleset while main lost classic protection outright).

This directory was first created by the bsuite#3199 lane for crm7/BSU `development`
rulesets (that lane's `<repo>-development-<date>.json` files and its README section
"the write these dumps record" live here too when that work lands). The bsuite#3165 lane
banks the **default-branch** rulesets of every repo, which is what the ruleset drift gate
reads.

## What lives here

| File | What it is |
|---|---|
| `bsuite-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/bsuite/rulesets/14254675` ("default", `~DEFAULT_BRANCH`) — the ruleset whose `required_linear_history` made every merge-commit promotion unmergeable (bsuite#3165), since removed |
| `crm7-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/crm7/rulesets/12812477` ("default") |
| `bsu-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/business-suite-unified/rulesets/13700163` ("default") |
| `conduit-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/conduit/rulesets/13440333` ("default") |
| `R80.4-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/R80.4/rulesets/20580638` ("default") |
| `braden-default-20260919.json` | Verbatim GET of `repos/GaryOcean428/braden/rulesets/7299433` ("default") |
| `<repo>-development-*.json` | crm7/BSU `development` ruleset before/after dumps (bsuite#3199 lane) |
| `<anything>-<YYYYMMDD>-pre.json` | Before-states (rollback references), invisible to the drift scan by filename |

**Throughput has no default-branch ruleset** (its only ruleset governs `development`, id
20729286) — that absence is the verified live state, not a missing dump; its `development`
ruleset is banked by the #3199 lane's work when it lands.

The bodies carry their own `source` field (`GaryOcean428/<repo>`), so a file never depends
on its filename to say which repo it describes. The filename supplies only the date that
makes "newest" meaningful.

## The one absolute: linear history is OFF, ratified

`required_linear_history` **must not exist on any ruleset in this estate.** The estate
promotes with `gh pr merge --merge` (never `--squash`, never rebase — they rewrite SHAs,
and the promotion PR is the record that a development tree was promoted). A ruleset that
forbids merge commits makes every promotion structurally unmergeable and pushes people
toward `--admin`, which is the habit of bypassing protection the drift gates exist to
end. Removal was performed 2026-09-07 and ratified in **ADR-0012 item 1** (operator
decision register, 2026-09-16).

`scripts/check-ruleset-drift.mjs` enforces this absolutely: `required_linear_history`
present **live** fails even when the banked dump agrees — because a dump that banks it is
itself stale and must be re-dumped after the rule is removed.

## Re-dumping (default-branch rulesets)

```sh
d=$(date +%Y%m%d)
gh api repos/GaryOcean428/bsuite/rulesets/14254675 > docs/security/branch-protection/rulesets/bsuite-default-$d.json
gh api repos/GaryOcean428/crm7/rulesets/12812477      > docs/security/branch-protection/rulesets/crm7-default-$d.json
gh api repos/GaryOcean428/business-suite-unified/rulesets/13700163 > docs/security/branch-protection/rulesets/bsu-default-$d.json
gh api repos/GaryOcean428/conduit/rulesets/13440333   > docs/security/branch-protection/rulesets/conduit-default-$d.json
gh api repos/GaryOcean428/R80.4/rulesets/20580638     > "docs/security/branch-protection/rulesets/R80.4-default-$d.json"
gh api repos/GaryOcean428/braden/rulesets/7299433     > docs/security/branch-protection/rulesets/braden-default-$d.json
node scripts/check-ruleset-drift.mjs                  # must be clean
```

**Two writes on the same day** share one filename; the before-state of the second is the
previous commit of that file, not a second file (`git log -p docs/security/branch-protection/rulesets/`
is the record) — the same convention as the classic dumps one level up.

**One ruleset may not carry two dumps of the same date.** The gate fails closed on that
shape (`dump-ambiguous-date`), because "newest" needs an unambiguous winner.

## The gate

`scripts/check-ruleset-drift.mjs`, run nightly by `.github/workflows/branch-protection-drift.yml`,
compares each newest dump against the live ruleset, one GET per ruleset (the list endpoint
returns no rules). **Weakening fails; strengthening warns** — same asymmetry as the classic
gate, same reason. On top of the asymmetry, one absolute: **`required_linear_history`
present live fails even when the dump agrees** (see above). It also fails on:

- a banked ruleset deleted live (`ruleset-absent`) — a deleted ruleset protects nothing
- enforcement `active` → `evaluate`/`disabled` (`enforcement-weakened`)
- a banked ref pattern no longer covered (`refs-no-longer-covered`) — the malformed-pattern
  shape of the 2026-09-07 incident
- unparseable or identity-less dumps (`dump-unparseable`, `dump-missing-identity`) — fail closed

And it warns on: rules/ref patterns/enforcement added live (`dump-stale`, re-dump), linear
history removed (the ratified direction), and a re-created ruleset id under the same name.

## What a green tick here does NOT say

- **bypass_actors are correct.** Which roles can bypass a ruleset is bsuite#3141
  territory; this gate watches the rule list, enforcement and ref pattern, not the bypass
  list.
- **classic protection is intact.** That is the sibling gate one level up.
- **a banked dump was ever CORRECT.** It asserts live has not drifted below it, plus the
  one absolute above.