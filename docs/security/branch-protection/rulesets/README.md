# Ruleset dumps (crm7 + business-suite-unified `development`)

This directory banks the **repository rulesets** that govern `development` on the two repos
whose 2026-09-08 incident enabled a direct push — bsuite#3199. It exists because the classic
branch-protection dumps one level up cover a different mechanism, and the parent drift gate
(`scripts/check-branch-protection-drift.mjs`) is hard-scoped to `GaryOcean428/bsuite` branch
protection: a file named `<branch>-<YYYYMMDD>.json` in the PARENT directory would be read as a
bsuite dump and compared against bsuite's live development protection, failing the nightly gate
on a repo it does not own. This subdirectory is invisible to that scan (it reads one level, not
recursively) and is deliberately not wired into the gate — wiring a second mechanism into the
same comparator is bsuite#3141 territory, not this change.

## What lives here

| File | What it is |
|---|---|
| `crm7-development-20260919.json` | **After-state**: the verbatim GET of `repos/GaryOcean428/crm7/rulesets/20729271` ("development") after the 2026-09-19 write |
| `bsu-development-20260919.json` | **After-state**: the verbatim GET of `repos/GaryOcean428/business-suite-unified/rulesets/20729281` ("development") after the same write |
| `crm7-development-20260919-pre.json` | **Before-state**: the same GET immediately before the write — the rollback reference and the no-weakening diff base |
| `bsu-development-20260919-pre.json` | **Before-state** for BSU |

The bodies carry their own `source` field (`GaryOcean428/crm7` / `GaryOcean428/business-suite-unified`),
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