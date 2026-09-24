---
kind: record
authority: none
owner: bsuite
---

# Branch protection posture: the ruleset binds nobody, two repos run production weaker than development, and only bsuite has dumps

https://github.com/GaryOcean428/bsuite/issues/3141

Snapshot updatedAt: 2026-09-07T09:47:13Z. Open at capture; re-read live.

Three findings from the 2026-09-07 protection loss (restored; guard in #3140). None is that incident — these are the conditions it exposed.

## 1. The ruleset is non-binding, and it looks like protection

Ruleset `14254675` ("default") on bsuite carries `deletion`, `creation`, `non_fast_forward`, `required_linear_history`, `required_status_checks` (2) and `code_scanning`. Its `bypass_actors`:

```json
[{"actor_type":"DeployKey","bypass_mode":"always"},
 {"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"},
 {"actor_id":81794144,"actor_type":"User","bypass_mode":"always"}]
```

`actor_id 81794144` is `GaryOcean428` — the account **every lane on this estate uses** — and `current_user_can_bypass` reads `"always"`. It has constrained none of our writes and never has. That is why `main` carries merge commits despite `required_linear_history`, and it means the ruleset's 2 required contexts are decoration for us.

**Consequence for reasoning, not just policy:** when classic protection vanished on 2026-09-07, the surviving ruleset made `GET /branches/main` still report `protected: true`. A reader who checked only that would have concluded main was protected. It was not, in any sense that binds us.

**Decision needed:** either drop the user from `bypass_actors` so the ruleset means what it says, or state that classic protection is the estate's only real mechanism and the ruleset is decorative. Either is defensible; the current state reads as the first and behaves as the second.

## 2. Two repos run production weaker than development

Measured across every repo in `.gitmodules` plus the parent, both branches — 14 pairs, all reachable:

| repo | main | development |
| --- | --- | --- |
| braden | 7 ctx, admins ✅ | 7 ctx, admins ✅ |
| business-suite-unified | 7 ctx, admins ✅ | 7 ctx, admins ✅ |
| conduit | 8 ctx, admins ✅ | 8 ctx, admins ✅ |
| **crm7** | 15 ctx, **admins ❌** | 15 ctx, **admins ❌** |
| **R80.4** | 4 ctx, **admins ❌** | 4 ctx, admins ✅ |
| throughput | 11 ctx, admins ✅ | 11 ctx, admins ✅ |
| bsuite | 34 ctx, admins ✅ | 33 ctx, admins ✅ |

- **crm7**: `enforce_admins: false` on `main`. Every one of its 15 required contexts is bypassable by an admin on production.
- **R80.4**: `enforce_admins: false` on `main` while its **own `development` has it true** — production is protected *less* than the branch that feeds it, which is backwards.

Force pushes and deletions are blocked everywhere, so this is a bypass gap rather than an open door. Left as found rather than "improved": changing another repo's protection is a policy call, not a restoration.

## 3. The dumps and the new guard cover bsuite only

`docs/security/branch-protection/` exists in this repo alone, so #3140's nightly comparison watches 2 branches of 14. The other six repos have no committed reference to diff against — which is exactly the objection `prod-rls-policy-drift-audit.yml` records for vanished RLS policies: without a snapshot file and a refresh protocol, a drift detector has nothing to compare to.

Extending it means dumping each repo's protection into this repo (the guard already accepts any `<branch>-<date>.json`, and `PROTECTION_REPO` is a single env var today — it would need to become per-dump). Not built here rather than half-built.

## Not determined

**Who** made the 2026-09-07 change. The actor on every ruleset version is `GaryOcean428`, which is every lane, every agent and the operator. The malformed ref pattern it introduced — `refs/heads/"main", "development"`, one literal ref containing quotes and a comma — is the shape of a shell-quoting accident rather than a UI edit, but that is inference, not evidence.

Refs: #3140, `docs/security/branch-protection/README.md`, `scripts/check-branch-protection-drift.mjs`
