---
kind: record
authority: none
owner: cowork-coordinator
---

# Estate Consolidation Assessment

**Measured 2026-08-25T00:10Z (local 2026-08-24 evening). Point-in-time — these numbers drift within hours.**
Author: `cowork-coordinator`. Every figure below is measured, not reported to me.

---

## 1. STATE OF THE ESTATE

**The estate is safe. It is not production-ready, and it is not close.**

| Dimension | State |
|---|---|
| **Work at risk of loss** | **NONE.** Zero unmerged branches remain local-only, estate-wide. Verified by direct check. |
| **Promotion** | **ALREADY DONE.** All 7 repos: `development` is fully contained in `main`. Nothing is waiting to promote. |
| **Branch sprawl** | Contained but not solved — see §3. Peaked at 166 local in the parent today. |
| **Production readiness** | **0 of 6 apps.** No app passes the accessibility gate or the manuals gate. |
| **Compliance** | 3 of 5 dimensions **FAIL** on evidence. |
| **Accountability model** | **Structurally broken** — see §7. This is the most important finding in this document. |

**The single sentence:** nothing is lost and nothing is stuck, but the estate cannot currently
prove who did what, cannot prove its gates ran, and cannot prove a deploy matches its source.

---

## 2. WHAT GENUINELY LANDED TODAY — with evidence

| Item | Evidence | State |
|---|---|---|
| **Promotion `development` → `main`** | All 7 repos: `git merge-base --is-ancestor origin/development origin/main` = YES. bsuite `main` tip `bb2bed22`, carrying 10 merge commits from development PRs #2341–#2395. | **LANDED** |
| **Skills-path repair** | 20 `bsuite-*` skills had **zero** presence in `~/.claude/skills`; resolved only for sessions rooted at the repo. 20 symlinks created; all 6 required skills verified resolving from a neutral cwd (`/tmp`); 20/20 dereference, 0 broken. | **CLAIMED-DONE — unverified, see §4** |
| **Branch drain** | 132 local + 95 remote branches, 8 worktrees removed, every one proven by `--is-ancestor`, never by merge date. Parent 166 → 78 local. | **CLAIMED-DONE — unverified, see §4** |
| **Preservation sweep** | **95 unmerged local-only branches pushed** (25 parent + 70 submodules). Estate-wide local-only count now **0**. | **LANDED** |
| **Precedent recorded** | 4 new Tier-2 rulings: closure-scope, zero-consumer, branch-budget, compliance-from-artefacts. All indexed. | **LANDED** |
| **docx register** | `bsuite notes.docx` (31.9 MB, 444 paragraphs) fully extracted → **103 numbered items**, against the backlog's 20. | **LANDED** |

**Not verified by me and therefore not claimed here:** publish circularity, the `profiles`
privilege-escalation fix reaching production, and migration reconciliation. Those were assigned
to lanes; I have **no artefact confirming any of the three landed**. They are listed in §5 as
half-done-or-unknown rather than in this table. *If a lane reports them done, that report is not
evidence — see §7.*

---

## 3. BRANCH AND WORKTREE STATE

| Repo | Baseline (am) | Peak today | **Now** | Worktrees | Local-only unmerged |
|---|---:|---:|---:|---:|---:|
| bsuite | 118 | **166** | **82** | 21 | **0** |
| crm7 | 59 | 59 | 44 | 18 | **0** |
| business-suite-unified | 20 | 20 | 9 | 1 | **0** |
| conduit | 16 | 16 | 10 | 2 | **0** |
| braden | 12 | 12 | 6 | 2 | **0** |
| throughput | 11 | 11 | 6 | 1 | **0** |
| R80.4 (sub) | 17 | 17 | 11 | 1 | **0** |
| R80.4 (standalone) | 7 | 7 | 7 | 1 | **0** |

- **Open PRs estate-wide: 1** — bsuite `#2396 fix/column-change-must-not-destroy-the-layout`, MERGEABLE.
- **Remote counts now EXCEED local in several repos** (bsuite 82 local / 85 remote) — expected
  and intended: the preservation sweep pushed 95 branches that had existed on one machine only.
  That is a deliberate trade of tidiness for safety.
- **Worktrees: 47** across the estate, down from a peak of 58.

### Preserved and explicitly untouched
| Item | State |
|---|---|
| `fix/po1-ad8-verify-and-ledger` | **now local + remote** (was local-only) |
| `chore/advance-pointers-lockfiles-and-toasts` | **now local + remote** (was local-only) |
| `crm7-1774` | MERGE_HEAD intact, 105 files uncommitted |
| `crm7-1812` | MERGE_HEAD intact, 28 files |
| `crm7-1812b` | MERGE_HEAD intact, 194 files (detached) |
| 5 worktrees with real uncommitted changes | untouched — `chore/nav-core-1.1.0` ×3, `fix/overrides-date-format`, `po1-ad8-verify` |
| 2 stashes | untouched — BSU route-inventory, R80.4 self-annotated preservation stash |

---

## 4. STILL `CLAIMED-DONE` — awaiting independent verification

**`datum` did not respond during this window. Both items below are MINE, so I cannot clear them.**

| Item | Why it needs another lane |
|---|---|
| **Skills-path repair** | I created the symlinks and I verified them. Verifier must independently confirm the 6 required skills resolve from a worktree cwd and that nothing was shadowed. |
| **Branch drain** | I deleted 132 local + 95 remote branches. Verifier must confirm by ancestry that nothing unmerged was deleted, and that the protected list survived. |

**These remain UNVERIFIED. They must not be reported as done.** That is the rule this estate
adopted today, and exempting the coordinator would make it theatre.

---

## 5. HALF-DONE, AND EXACTLY WHERE IT STOPS

| Item | Stops at |
|---|---|
| **`development` → `main` sync-back** | **3 of 7 repos synced** (crm7, BSU, conduit — now 0/0). **4 rejected by branch protection**: bsuite, braden, throughput, R80.4 return `GH006: Protected branch update failed — changes must be made through a pull request`. `main` sits 10/12/13/38 commits ahead respectively. **Needs one sync PR per repo.** The rejection is correct behaviour, not a fault. |
| **SPEC T — tokens** | Assigned, may proceed, not started. Gated internally by B-5, B-6. |
| **SPEC C — reporting** | **Hard-blocked on B-1 for 12 days.** ~15,500 LOC, 17 requirements. |
| **SPEC S — schema builder** | ~⅓ done per backlog 5.3, **and its status does not say so**. Blocked behind C. |
| **Publish circularity / `profiles` fix / migration reconciliation** | Assigned to lanes; **no artefact reaching me confirms any landed**. Unknown, not done. |
| **3 drift CI checks** | **Specified, not built.** `gate-artefact-required`, `branch-drain`, `closure-criteria`. Each needs a planted-defect negative control before it is trusted. |
| **12 `UNASSIGNED-NEEDS-LANE` docx items** | Named, not dropped. Incl. **U-11 supervisors from other hosts selectable — cross-tenant exposure, should be security-triaged, not queued.** |

---

## 6. COMPLIANCE SCORECARD — computed from artefacts, nobody was asked

| Dimension | Score | Evidence |
|---|---|---|
| **Ship process** | **FAIL** | Visual-gate artefact on **2 of the last 12** merged bsuite PRs. 83% of merges carry no gate evidence. |
| **GPG signing** | **FAIL** | `%G?` = `E` on the tip of **every** repo's `development`. Signed commits are a minority everywhere; **R80.4 is 0 of 75**. |
| **Comms presence** | **FAIL** | **Zero** `bsuite_presence_*` records exist. The synapse cannot route to any lane or show LIVE vs DARK. |
| **Hygiene** | **PASS** | merged-not-cleaned ≈ 0 estate-wide after the drain. |
| **Completion integrity** | **UNKNOWN** | No sampled closure enumerated criteria with a denominator. Standard written today — baseline, not breach. |

### P0 — the GPG finding is worse than a hygiene issue
Unsigned commits cause **Vercel to silently cancel deploys**. Every `development` tip in the
estate is `E` (signature unverifiable). **Therefore any gate result read off a deploy may be from
a stale build**, and R80.4 — 0 signed of 75 — is the most exposed.

**I could not check live deploy SHA against pushed SHA** (no Vercel MCP in this lane). That check
is **UNKNOWN, which under fail-closed is not a pass.** Until someone runs it, no green gate in
this estate should be trusted.

---

## 7. THE TOP STRUCTURAL GAP — `LANE-MARKER`

**There is no agent identity anywhere in git.** Seven days of commits across eight repos return
exactly two author identities — `GaryOcean` and `GaryOcean428`, both the operator — with **no
trailers and no `Co-Authored-By`**.

**Consequences, and they are not small:**
- Per-agent compliance **cannot be computed**. The scorecard above is per-repo because per-agent
  is impossible.
- **Every rule in the precedent book is unenforceable against an individual.** A branch budget
  with no attributable owner is a request, not a rule.
- Breach is measurable per repo only. When 89 branches sat merged-and-uncleaned, no lane could
  be named.

**Fix:** mandate a lane marker — a branch prefix `lane/<name>/…` or a commit trailer
`Lane: <name>`. Until one exists, **the accountability model built today is structurally
incomplete**, however well the rules are written. Logged as `LANE-MARKER`,
`UNASSIGNED-NEEDS-LANE`, in `bsuite_worktracker`.

---

## 8. DISTANCE TO PRODUCTION-READY, PER APP

Against the 11 estate gates in `bsuite_definition_production_ready`.

| App | Open issues | Gates passed | The honest blocker |
|---|---:|---:|---|
| **R80.4 / R8** | 6 | **~1/11** | 38 docx items, 4 of them operator-flagged regressions. Award engine unreachable — 112 of 179 modules. **0 signed commits of 75.** Money-path errors live (commercial construction misprices every shift hour). |
| **throughput** | 3 | **~1/11** | Its own `ui/Button.tsx` carries **no focus ring**; 146 raw `<button>` vs 5 `<Button>`. Entire `src/components/navigation/` unmounted by its own code. |
| **crm7** | 96 | ~2/11 | Highest issue count in the estate. SPEC C blocked. `#1705` SMTP open 12 days — *"raised 20+ times"*. a11y gate itself crashes (`#1635`). |
| **business-suite-unified** | 14 | ~2/11 | Permissions defaults absent entirely (raised 3× in one document). Platform-branding sweep never done. |
| **braden** | 3 | ~2/11 | 60-file Site Editor unreachable. `leads` ownership unresolved (B-7). |
| **conduit** | 5 | ~3/11 | Best focus coverage (50.6%) but still fails P7. Next.js theme parity. |

**Estate-wide: 0 of 6 pass P7 (accessibility) or P9 (manuals with signed-off screenshots).**

---

## 9. DECISIONS THAT GENUINELY NEED BRADEN

| # | Decision | Blocks | Open |
|---|---|---|---:|
| **B-1** | Is a report an editable **view of records**, or a read-only **saved question**? | All of SPEC C — ~15,500 LOC, 17 requirements. Nothing is safe to delete before it. | **12 d** |
| **B-2** | Set `FAIRWORK_API_KEY`? | The entire compliance lane; R8 shows *"Offline"* and MAPD search returns HTML not JSON. | 8 d |
| **LANE-MARKER** | Branch prefix or commit trailer? | **The whole accountability model** — §7. | new |
| **GPG/Vercel** | Fix signing, or accept unverifiable deploys? | Every gate result in the estate. | new, **P0** |
| **D-43** | The 21 frozen `placements` rows — set the 9 NULL-status to `manual`? | Caris's 8 placements are frozen; she cannot save any edit. | 4 d |
| B-5/B-6 | Per-app accents; flattening direction | SPEC T | 3 d |
| B-9 | Is the super-admin tier real? | Delegation model | 17 d |

Plus 19 further `B-` items in the execution backlog, and **12 `UNASSIGNED-NEEDS-LANE`** docx items.

---

## 10. WHAT I WOULD DO FIRST TOMORROW

1. **Rule on B-1.** It has blocked ~15,500 LOC for 12 days and gates two of three specs.
2. **Decide the lane marker.** Everything else in the accountability model rests on it.
3. **Fix signing, or rule that we accept unsigned.** Right now no gate result is trustworthy.
4. **Open the 4 sync PRs** to bring `development` level with `main` in bsuite, braden, throughput, R80.4.
5. **Security-triage U-11** — supervisors from other hosts are selectable on a placement.
6. **Have a lane other than me verify the two `CLAIMED-DONE` items.**
