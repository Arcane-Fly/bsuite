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
| `<repo>-default-<YYYYMMDD>.json` | Verbatim GET of each repo's `default` (`~DEFAULT_BRANCH`) ruleset — bsuite 14254675, crm7 12812477, BSU 13700163, conduit 13440333, R80.4 20580638, braden 7299433. Throughput has no default ruleset (verified live) |
| `<repo>-development-<YYYYMMDD>.json` | Verbatim GET of each repo's `development` ruleset — crm7 20729271, BSU 20729281, conduit 20729275, braden 20729284, throughput 20729286. R80.4 has none (verified live) |
| `crm7-development-20260919-pre.json` | **Before-state** of the 2026-09-19 bsuite#3199 write — the rollback reference and the no-weakening diff base |
| `bsu-development-20260919-pre.json` | **Before-state** for BSU |

All current dumps were re-taken 2026-09-24 from `repos/Arcane-Fly/<repo>/rulesets/<id>` after the org
transfer, so their `source` is `Arcane-Fly/<repo>`. The 2026-09-19 after-states (source `GaryOcean428/...`)
were retired in the same change: the gate keys a dump by its body's `source`, so an old-owner dump beside a
new one would bank the same ruleset twice. They remain in `git log -p` of this directory. The org-level
`Basic` ruleset (id 18904242, identical on every repo) is not repo-owned and is not banked here.

The bodies carry their own `source` field (`Arcane-Fly/<repo>`),
so a file never depends on its filename to say which repo it describes.

## The write these dumps record (2026-09-19, bsuite#3199)

Before: both "development" rulesets carried `rules: [deletion, non_fast_forward]` and
`bypass_actors: [{actor_id: 5, actor_type: RepositoryRole, bypass_mode: always}]` — the admin
role could bypass everything, so a direct push to `development` succeeded. That was the
enabling condition of the 2026-09-08 incident (`b8d2e232a` pushed straight to crm7
`origin/development` outside PR #2533 while the branch's checks were red).

After: `bypass_actors: []` and a third rule appended:

```json
{
  "type": "pull_request",
  "parameters": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews_on_push": false,
    "require_code_owner_review": false,
    "require_last_push_approval": false,
    "required_review_thread_resolution": false,
    "allowed_merge_methods": ["merge"]
  }
}
```

Zero approvals is deliberate — the agent merge lane self-reviews via bots (operator ruling
2026-09-04) and a ≥1-approver requirement would deadlock it. The rule exists to block direct
pushes, not to add human review. `allowed_merge_methods: ["merge"]` encodes the never-squash
doctrine. The GitHub API accepted the PUT verbatim (no fallback needed) and added two
server-managed defaults inside the new rule: `required_reviewers: []` and
`require_extra_approval_for_unattributed_changes: true` (not in the PUT schema; the latter only
bites when a PR carries commits unattributed to a member — normal agent-lane commits are
authored `braden.lang77@gmail.com`, a member, and are unaffected).

`current_user_can_bypass` read `always` before the write and `never` after — for the very
identity every lane on this host shares.

## Verified by positive control, not by the API's 200

A 200 on the PUT proves nothing about enforcement (bsuite#3141: "the ruleset binds nobody").
Both repos were proven with a deliberate-failure push of an `--allow-empty` commit from a
scratch clone as the shared identity; both were REFUSED and both remote refs were verified
unchanged afterwards:

- crm7: `GH013: Repository rule violations found for refs/heads/development` —
  `Changes must be made through a pull request.`; `development` still at `a3ca72de`.
- business-suite-unified: same refusal (plus its 7 required status checks expected);
  `development` still at `502eee3b`.

## Maintenance

- Re-dump here in the same PR as any future ruleset write on these two repos' `development`
  rulesets, using the `*-pre.json` → `*.json` pairing above (before-state committed in the
  same PR as the write that supersedes it).
- The default rulesets (crm7 12812477, BSU 13700163) still carry broad `bypass_actors`
  including RepositoryRole 5 with `bypass_mode: always`; narrowing those is bsuite#3141's
  sweep and was deliberately not absorbed here.
- Classic branch protection on both repos' `development` (crm7: 15 required contexts,
  `enforce_admins: false`; BSU: 7 contexts, `enforce_admins: true`) is a separate layer and
  was not touched by the 2026-09-19 write.

| `<repo>-default-*.json` / `<repo>-development-*.json` | See "What lives here" above |
| `<anything>-<YYYYMMDD>-pre.json` | Before-states (rollback references), invisible to the drift scan by filename |

**Throughput has no default-branch ruleset** (its only ruleset governs `development`, id
20729286) — that absence is the verified live state, not a missing dump; its `development`
ruleset is banked by the #3199 lane's work when it lands.

The bodies carry their own `source` field (`Arcane-Fly/<repo>`), so a file never depends
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

## Re-dumping (every repo ruleset)

```sh
d=$(date +%Y%m%d)
declare -A SLUG=([bsuite]=bsuite [crm7]=crm7 [business-suite-unified]=bsu [conduit]=conduit [braden]=braden [R80.4]=R80.4 [throughput]=throughput)
for r in "${!SLUG[@]}"; do
  gh api repos/Arcane-Fly/$r/rulesets --jq '.[]|select(.source_type=="Repository")|"\(.id) \(.name)"' |
  while read id name; do
    gh api repos/Arcane-Fly/$r/rulesets/$id > "docs/security/branch-protection/rulesets/${SLUG[$r]}-$name-$d.json"
  done
done
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
