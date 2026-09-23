---
kind: decision
authority: operator
owner: bsuite
evidence:
  - docs/adr/README.md
  - AGENTS.md
---

# ADR-0012 — Operator decision register, 2026-09-16

| | |
|---|---|
| **Status** | Dispositions recorded — delegated Codex ruling 2026-09-16; implementation remains gated |
| **Raised** | 2026-09-16 |
| **Decider** | Braden; Codex applies standing instructions under the explicit request “rule on this” |
| **Scope** | Cross-repo: bsuite, crm7, business-suite-unified, conduit, R80.4, throughput |
| **Supersedes** | — |

## What this is

Fourteen numbered entries, originally presented as decisions reserved to the operator,
consolidated from one day's evidence rather than sent piecemeal. The disposition below
supersedes that blanket reservation; the original briefs remain as dated evidence. Each carries **Situation, Evidence, Options, Precedent, Recommendation** — enough
context to rule without opening anything else, and a recommendation that commits to a position
and says what would make it wrong.

**Twenty-one further candidates were removed** because precedent already settles them; they are
listed at the end with the ruling that settles each, so the omission is auditable rather than
silent.

## Ruling log — controlling disposition, 2026-09-16

**Authority and scope.** Braden requested “rule on this” in Codex task
`01a07f58-73a6-71f2-a57d-5cf3b6b148dc`. These are Codex's delegated dispositions,
not a fabricated quotation that Braden individually approved every original recommendation.
They apply his instructions in this conversation: necessary safe work is work to execute,
not a repeated permission question; preserve client records; prefer maintainable class-wide
solutions; verify upstream/downstream effects and the complete user journey; preserve
subscription and permission boundaries. [The execution contract](../../.agents/rules/remediation-execution.md)
requires one dispatch owner, rehearsed failure paths, fresh evidence and production promotion
by PR. [AGENTS.md](../../AGENTS.md) protects production and the canonical authority predicate.

**Rule and application.** Existing authorisation permits necessary implementation and
verification. It does not manufacture unknown business facts, authorise unreviewed external
communications, waive release gates, or prove a stale premise. Accordingly, choose the
safe implementation path below and have the existing operative owner drive it to completion.
A conditional execution gate is an assigned task, not a new request for approval.
Novel engineering choices below are expressly delegated judgments applying these principles;
they are not represented as historical operator rulings.

| # | Disposition and required action | Execution boundary / evidence |
|---|---|---|
| 1 | Preserve the recorded linear-history decision. Align `enforce_admins=true` on crm7 and R80.4 main with the existing protected-production rule after checking automation compatibility. | Original log records linear-history removal from crm7 `12812477` and BSU `13700163`, with live readback; this pass has not repeated it. Do not call a personal `always` bypass “decorative”: it is effective authority. Inventory App and human bypasses, migrate automation to least-privilege App identities, and preserve a documented operator recovery path. No routine admin bypass or wholesale removal of recovery access. |
| 2 | No waiver: build and rehearse every missing migration/rollback packet. Promote independently ready apps when their complete dependency gates pass. | Reconcile the inventory first: the brief says five scheduled migrations but counts BSU#1233 as one of the two covered although it is absent from that list; Option C plus three conduit versions is four, not three. Record each version/name, caller dependencies, rollback or rehearsed data-preserving recovery, pre/post assertions and live fingerprints. PR revert alone is not database recovery. |
| 3 | Restore effective independent review on all seven repositories; diagnose configuration/access first and repair it. | Verify Qodo installation and actual dispatch; throughput is unmeasured. A missing comment does not establish the cause. Do not remove a dispatch guard to make a reviewer run. Suppress proven nonfunctional upsell noise at repository scope; do not globally uninstall an App used elsewhere. Verify an actual review, not just installation. |
| 4 | Converge on `is_platform_developer()`; remove the redundant helper through a guarded migration if fresh dependency checks confirm it is unused. | Search live catalog, grants, dynamic callers and in-flight branches, not main alone. If there are consumers, migrate them first. Preserve the canonical predicate's semantics and reconcile tests. The brief's assertion that BSU depends on it conflicts with its zero-callers evidence and must be resolved before DROP. |
| 5 | Prioritise the portal RLS exposure as a P0 implementation task; enforce persona-versus-authority separation at the database boundary. Apply the detailed scope below. | No blanket staff access or new privilege inferred from membership/table names. Produce a role × operation × row/field-scope matrix and prove allowed and denied journeys using a faithful disposable database before production rollout. Verify live results without synthetic writes to client records. |
| 6 | Permit field officers/managers to edit contact, placement and training-assessment records within their assigned caseload, subject to existing entitlements and tenant-admin revocation. | Delegated choice: productive caseload work accords with the user's maximum permitted capability and in-page correction requirements. Enforce field-level and workflow boundaries: this does not grant billing, identity/role administration, unqualified assessment sign-off or arbitrary caseload assignment. Prove cross-caseload denial and legitimate saves. |
| 7 | Remedy key-recovery risk; first establish the actual custody/recovery architecture, then implement a rehearsed, recoverable rotation if needed. | Do not accept “Vault secrets can never be read back” as verified. Identify Vault versus platform-secret storage and the authorised recovery path without printing secret values. Secure escrow and tested restore must exist before cutover; preserve old decryption until every affected current document passes verification. Never put keys in chat, commits or evidence packs. If operator-held custody is essential, finish preparation and request that specific custody step only. |
| 8 | Build and deploy report-only retention evaluation, with legal holds, tenant/category policy and auditable results. Keep irreversible deletion unarmed. | A stale zero is not authority to destroy. This ruling authorises engineering/preview, not recurring deletion of client records. Prepare the exact retention policy and preview before any separate destruction authorisation. Award-rate secret repair is an independent routine task with its own preflight. |
| 9 | Repair report delivery, but quarantine all stale unsent packs across all tenants from automatic replay. Preserve their records and audit history. | Reject the recommendation to send the other 37 merely because they are not FutureBuild. Produce fresh recipient/date/content previews; no drain, cancellation/deletion or external send is authorised by this ruling. Validate new scheduling against existing customer subscriptions and delivery consent, with duplicate/retry protection. |
| 10 | Recover the actual host-change evidence; until resolved preserve the disputed placement and do not mark host steps complete. | Neither SAME_HOST nor NEW_HOST is a known fact on this record. Use an explicit unresolved/review state; NEW_HOST may be a conservative workflow branch only if it makes no factual claim or automatic external action. Search the original message/audit trail first. Other independent work continues; dependency gates are measured, not “cannot run this week” guesses. |
| 11 | Apply the canonical outline-based focus treatment across sibling surfaces, using shared theme tokens and visible keyboard-focus verification. | Do not close on a string grep alone or rewrite compiled CSS blindly. Check generated defaults, actual computed paint, clipping, forced-colour mode, both themes and the full keyboard journey. Do not weaken the no-pure-endpoint theme requirement to pass. |
| 12 | No blanket decorative exemption. Classify the callout border by its actual function and verify each affected pattern. | A demonstrably redundant border may be decorative; any boundary/state indicator needed for understanding must meet the applicable contrast requirement. Labels must convey status without colour. Correct Jodie chips' semantic selected state and visible non-colour cue regardless. Record measured evidence before narrowing an issue. |
| 13 | Remove the erroneous parent-only preview association if a fresh dependency inspection proves it serves no required deployment/preview path. | Confirm the actual parent/submodule migration and preview topology first. Preserve production project, data, required checks and functioning child integrations; no blind disconnect. Verify a subsequent parent check set and functioning child preview/migration path. |
| 14 | Use a separate narrowly scoped Jodie GitHub App; build and verify the receiver, queue and token handling before connecting events. | Keep the estate automation App's privileges separate. Browser setup is agent-executable where supported: account ownership is not a reason to hand routine clicks back. Validate signatures, replay/idempotency, least-privilege permissions and event scope. Installation does not authorise arbitrary issue/PR communications outside the existing automation scope. |

### Decision 5 — executable permission boundaries

- **Q1:** owner/admin/manager/staff/field roles remain staff personas, but each operation
  still requires the existing capability and row scope; field roles retain caseload limits.
  Guests, viewers, training providers and restricted grant roles do not gain staff-wide access.
  Platform authority remains separate from tenant authority.
- **Q2:** remove guest authority on billing-cycle/rate-adjustment administration. Owner/admin
  is the default pending a verified existing delegated billing capability; preserve legitimate
  explicit financial roles rather than deleting them because a table name suggests a policy.
- **Q3:** expose only the reference/configuration data required by an authorised portal journey.
  Keep internal workflow, commercial, permission, quota and secret-bearing configuration
  inaccessible; use restricted projections where mixed tables contain safe reference data.
  Enumerate all 74 claimed tables; a category label is not a completed review.
- **Q4:** own pay history and induction records are allowed within current entitlement.
  Guardian consent/LLN material stays restricted unless an existing scoped user journey and
  permission explicitly entitle that person; no bulk access to others' records.
- **Q5:** host users can see their own permitted quotes/charge snapshots and explicitly shared
  documents, never confidential HR records by mere tenancy. Do not grant leave/training-plan
  access in this repair absent an existing explicit scoped entitlement; trace those workflows
  before removing any verified legitimate access.
- **Q6:** missing host mapping fails closed with an actionable repair path. Never choose the
  oldest employer or another host as a fallback.
- **Q7:** resolve the canonical person by verified user identity and active tenant membership.
  A legacy contact fallback must prove the same person and tenant; ambiguous/conflicting links
  fail closed and require repair. Test multiple tenants, stale mappings and mixed-link records.

### Follow-through contract

The existing BSuite supervisor remains dispatch owner. Turn each disposition into the linked
issue's concrete next action, named owner, prerequisites and evidence criteria; do not create
another supervisor or duplicate the queue. Prioritise #5 and related #4/#6 security paths,
then the dependency-ready release work. Record “ruled”, “implemented”, “deployed” and “verified”
separately. Do not ask Braden to approve these same engineering choices again.

Only a genuinely unavailable fact (#10), essential custody action (#7), or later concrete
external-send/destruction proposal (#8/#9) may still require operator input. Prepare everything
independent first and state precisely what is missing. These limited boundaries do not block
other lanes. No new operational execution is claimed by this document-only ruling.

**Verification scope:** all fourteen briefs read; historical claims retained as dated evidence;
no live database/GitHub security mutation performed by this pass. QIG Memory tools were not
callable in this turn's tool inventory, so remote precedent retrieval/recording is not claimed.
Current conversation, repository instructions and the linked execution contract are the
retrieved authority used. This record and its ADR index are the local continuation entry point.

## Provenance and limits

Authored 2026-09-16 from finished sources only — `blocked-triage/synthesis.md` (36 blocked ledger
rows reconciled: 23 stale, 10 operator, 1 third-party, 2 blocked),
`release-blockers/plan-v2/challenge-v2.md` (SEND_BACK; 11 of 14 v1 defects answered, 6 new, 3 HIGH),
`nav-siblings/report.md` and `bot-gate/findings.md`.

**Not independently fact-checked.** Author pass only. Items the author marked unverified are
labelled as such in place, and remain unverified here: the BSU#1173 focus-ring evidence is from
2026-09-15 and was not re-fetched (no browser in that lane), and for the Qodo gap both the
App-installation cause named in bsuite#1883 and throughput's own status are unverified — no
throughput PR was in the six-PR set the observation came from.

---

# Decisions — 2026-09-16

Sources: the 36-row blocked-ledger reconciliation (`blocked-triage/synthesis.md` plus
`triage-1.md` through `triage-6.md`, dated 2026-09-15/16), the plan-v2 release challenge
(`release-blockers/plan-v2/challenge-v2.md`, VERDICT SEND_BACK, written 13:05 today), the
bsuite#3231 nav-sibling sweep and the bot-review-gate finding (both read-only passes run
today, 2026-09-16), and the crm7#477, bsuite#3144 and business-suite-unified#1173 closure
audits (dated 2026-09-15).

**Live-state correction on the release plan's three "answered but unbuilt" defects.** The
earlier attempt flagged three cases where the plan-v2 challenge treated a lane as gating a
promotion step when the lane didn't actually exist. Re-checked live, as at 13:37 AWST today:
one has closed — BSU#1233's follow-up (the subject-ownership harness fix, "fix3") landed as
commit `0d03fc0` in worktree `claude-bsu-1233-followup`, now open as
`business-suite-unified#1255` against `development`, with its Vercel check passing. The other
two still stand exactly as the challenge found them: crm7's W9 lane (the crm7#2631 follow-up
fixes) has zero commits (`git log acecc9a0b..origin/development -- src/lib` returns 0, run
this session); BSU's "Option C" migration (business-suite-unified#1252) is still only a draft
SQL fragment under a read-only evidence folder — no migration file exists in
`business-suite-unified/supabase/migrations` on `origin/development` (checked live this
session), no rollback, no packet. Neither of the two still-open items is a decision for you —
they're unbuilt work, not open questions — so they don't get their own entry below, but
decisions 2 and 5 both depend on lanes in the same state.

---

### 1. Whether crm7 and business-suite-unified's main branches should drop `required_linear_history`, the same way bsuite's already has

**Situation.** bsuite's main ruleset (id `14254675`) already had `required_linear_history`
removed by a lane on 2026-09-07, without your sign-off — a record-correction comment was
posted on bsuite#3165 today naming this. crm7's own main ruleset (`12812477`) and
business-suite-unified's own main ruleset (`13700163`) still carry `required_linear_history`
today. Every recent promotion into bsuite main used `--merge` (two-parent merge commits). If
that same `--merge` promotion is attempted on crm7 or business-suite-unified main while the
rule stays on, it will refuse with GitHub's "base branch policy prohibits the merge" — the
exact error bsuite hit before its rule was pulled. Separately, bsuite#3141 asks whether that
same `14254675` ruleset's always-bypass grant to your own account, and the weaker
main-vs-development posture on crm7 and R80.4, should stand.

**Evidence.** Ruleset and branch-protection reads run this session, 05:4x UTC 2026-09-16 (all
verified fresh, not carried from any prior pass): bsuite `14254675` — rule types `deletion`,
`creation`, `non_fast_forward`, `required_status_checks` only, no linear history;
`bypass_actors` includes user `81794144` (your account) at `bypass_mode: always`. crm7
`12812477` — rule types include `required_linear_history`; target `~DEFAULT_BRANCH`;
enforcement `active`; `bypass_actors` are eight named GitHub Apps/integrations plus
`RepositoryRole` 5 — no personal-account bypass entry. business-suite-unified `13700163` — same
`required_linear_history` present; target includes `refs/heads/main` explicitly; same
App-only bypass shape. Classic branch protection (separate mechanism): crm7 main
`enforce_admins=false` (15 contexts), crm7 development `enforce_admins=false` (15); R80.4 main
`enforce_admins=false` (4 contexts), R80.4 development `enforce_admins=true` (4) — R80.4's own
feeder branch is currently stricter than its production branch. bsuite main classic
protection: `linear=false`, `enforce_admins=true`, 34 contexts. Source for the bypass/
enforce_admins framing: `blocked-triage/synthesis.md` and `triage-1.md` (bsuite#3141 section),
both dated today; the `14254675`-specific numbers above were independently re-read by me this
session, not copied from those files.

**Options.**
- **(a) Ratify bsuite's removal only; leave crm7 and business-suite-unified as they are.**
  Cost: the next crm7 or business-suite-unified `--merge` promotion into main refuses exactly
  as bsuite's did, and whoever runs it either stops to ask you or bypasses with `--admin` —
  the habit bsuite#3165 exists to stop, now displaced onto two more repos.
- **(b) Ratify bsuite's removal and drop `required_linear_history` from crm7 and
  business-suite-unified's main rulesets too**, using the same PUT-without-the-rule shape
  already used on bsuite. Cost: none identified — no repo's linear-history rule protects
  anything the merge-commit policy (`gh pr merge --merge`, two parents) doesn't already give
  you; forecloses nothing, since the audit trail this policy relies on is unaffected by this
  one rule.
- **(c) Reverse bsuite's removal** (put the rule back everywhere) and require rebase-merge or
  `--admin` for every future promotion. Cost: every promotion becomes either a rebase-merge
  (losing the two-parent signal the standard-merge procedure relies on) or an `--admin` bypass
  on every single merge — highest friction, and a reversal of what's already live on bsuite.

On bsuite#3141's separate bypass/enforce_admins questions: accept the `14254675` bypass grant
to your account as decorative (every lane authenticates as you regardless, so removing it only
pushes the same writes onto `--admin`), or reject it, which needs a second, narrower-permission
identity stood up first. And: set `enforce_admins=true` on crm7 main and R80.4 main (both
currently `false`), matching bsuite's own posture and R80.4's own development branch — or leave
two of your three production trunks weaker than the branch that feeds them.

**Precedent.** You have not personally ruled on any of this; the 2026-09-07 record shows a
lane acted first and asked after. The closest precedent is bsuite's own main branch, which
already carries the stricter posture (`enforce_admins=true`, no linear-history requirement)
this decision would extend to crm7 and R80.4 main — by a 1:1 ratio, same rule, same reasoning,
applied to the two production trunks that don't yet have it. On the bypass-actor question, the
book is silent — nothing you've ruled elsewhere addresses whether an account holder should be
able to bypass their own estate's rules.

**Recommendation.** Ratify bsuite's removal, extend the same removal to crm7 and
business-suite-unified main, set `enforce_admins=true` on crm7 main and R80.4 main to match
bsuite and R80.4's own development branch, and treat the `14254675` bypass grant as decorative
rather than reversing it. This keeps every production trunk on merge-commit promotions, keeps
the audit trail already relied on, and stops the same "refuse then `--admin`" cycle repeating
on two more repos before their promotions run. I'd be wrong if a rebase-merge or squash policy
were actually intended for crm7/business-suite-unified (nothing in the release plan references
one — it assumes `--merge` throughout) or if a second, narrower-permission identity for lane
authentication already exists somewhere I haven't found.

---

### 2. Whether the release proceeds with three of five scheduled migrations still carrying no tested rollback

**Situation.** The release plan (`plan-v2.md`, written today) schedules five migrations for
manual early-apply or dispatch: the crm7 Jodie tenant-scope migration, business-suite-unified's
"Option C" invitation-write-path fix, and three conduit migrations (`20260909210000`,
`20260909230000`, `20260910010000`). The plan's own Migration Packet rule requires a tested
`rollback.sql`, rehearsed on a production-shaped replica, before any of these goes near
production. This is a go/no-go on the release, not a design question — the plan cannot
honestly call a file "ready to apply" if it has never been rolled back once.

**Evidence.** Verified this session, read-only: only two of the five have a rollback
artefact — the crm7 Jodie migration
(`readonly-batch2/r8-jodie-migration-replay/rollback-rehearsal.txt`: drops both function
overloads, re-apply succeeds, fingerprints match before/after/reapply) and BSU#1233's own R1
packet (`packets/r1-bsu1233-landed/rollback.sql`, tested, restores two function bodies and
three comments verbatim). Searched this session for the other three: no `rollback.sql`,
`pre-selects.sql` or `post-selects.sql` exists anywhere in the session's evidence tree for
Option C or any of the three conduit migration versions. Option C itself is still only
`readonly-batch2/r3-seat-available/proposed/C_restore_rpc_as_sole_invitation_write_path.sql` —
tested on a disposable replica, never given a migration filename, confirmed absent from
`business-suite-unified/supabase/migrations` on `origin/development` this session. This is
challenge-v2.md's own finding ND-2, independently re-confirmed by me rather than carried
forward as a number.

**Options.**
- **(a) Hold all three ungated migrations out of the release until each has a tested
  rollback.** Cost: extends the timeline by however long a writer lane needs to build and
  rehearse three rollback scripts — likely under a day each, based on how long the two
  completed ones took.
- **(b) Allow the three to ship without a tested rollback**, accepting "revert the PR" as the
  fallback. Cost: the plan's own hard constraint, quoted in the plan itself, is that reverting
  the PR is not a rollback once a migration has actually run — this accepts an unrecoverable-
  if-wrong state on three production DDL changes, one of which (Option C) is a
  privilege-escalation fix touching `team_invitations`, a table FutureBuild uses.
- **(c) Ship only the two with tested rollbacks now (crm7 Jodie, BSU#1233) and hold the other
  three for a later, separate release step.** Cost: splits the release into two waves, but
  nothing is lost — the plan already treats app promotions as independent ("do not hold a
  ready app for a late one").

**Precedent.** The plan's own words: "revert the PR is not a rollback if a migration ran."
The two completed rollback packets (R1, R8) are the standard already met twice this session;
nothing excuses the other three from the same bar.

**Recommendation.** Hold all three (option a) until rollback is written and rehearsed, but
don't let that stall the two that already clear the bar — let crm7's Jodie fix and BSU#1233
proceed, and the other three follow when ready. This is the plan's own rule, applied evenly
rather than waived for convenience. I'd be wrong if you're willing to accept "revert the PR" as
sufficient for a purely additive migration (adding an index or an RPC, nothing dropped) — if
so, the bar could reasonably differ for additive versus destructive DDL, and only Option C
(which changes a write path controlling who can grant admin rights) would need to hold.

---

### 3. Whether to restore code review on bsuite and throughput (bsuite#1883)

**Situation.** Six PRs opened today across the estate (the bsuite#3277/#3231 fix lanes) got
automated review from Qodo on five of six repos — crm7, business-suite-unified and conduit PRs
all received a Qodo summary and a full code review within one to three minutes of opening.
bsuite#3279, the parent-repo PR in the same batch, got none: no Qodo summary, no review, zero
inline comments — while Sourcery, GitHub Actions and the Supabase preview bot all fired on it
in the same window. bsuite#1883, filed against exactly this gap, is still open.

**Evidence.** Verified this session from live `gh pr view --json comments,reviews` plus the
REST comment/review endpoints on all six PRs (`bot-gate/findings.md`, generated today): crm7#2642
(3 findings), crm7#2643 (4), business-suite-unified#1253 (2 actionable + 1 answerable),
business-suite-unified#1254 (3), conduit#732 (1) — all reviewed by Qodo. bsuite#3279 — zero
Qodo activity of any kind. Sourcery posted its "your private repo has no access" upsell on all
six PRs, including the five Qodo reviewed — it functions as a reviewer on none of them.
`coderabbitai` and `copilot-pull-request-reviewer` are absent from all six. No throughput PR
was in today's batch, so Qodo's status on throughput is **unverified** from this evidence — I
am not asserting it either way. The App-installation cause bsuite#1883 names (Qodo's GitHub
App losing repository access to bsuite and throughput since 2026-09-05) is consistent with
what I observed on bsuite but is itself **unverified** — I checked PR threads, not the App's
installation record.

**Options.**
- **(a) Re-grant Qodo's GitHub App access to bsuite and throughput.** Cost: minutes in GitHub's
  App settings; restores review parity across all seven repos with no other estate change.
- **(b) Record a deliberate exclusion for bsuite and throughput** and name a replacement
  reviewer. Cost: there currently isn't one — Sourcery's upsell means it covers none of the
  seven — so this leaves the parent repo (which carries every cross-app promotion PR) and
  throughput with no bot-level second opinion indefinitely.
- **(c) Remove the dispatch-label guard on `claude-review.yml`**, if that guard is the actual
  suppression mechanism on the parent repo — unverified whether it is, worth an agent checking
  before choosing this route.
- **(d) Uninstall Sourcery from all seven repos**, since it currently reviews none of them and
  only posts an upsell notice. This doesn't fix the bsuite/throughput gap but removes noise
  from the other five.

**Precedent.** None specific — this is a tooling gap, not a policy question with a prior
ruling.

**Recommendation.** (a), and separately (d). Re-granting access is the direct fix for the
observed gap and has no downside. Uninstalling Sourcery is independent housekeeping — it
hasn't functioned on any of the seven repos this session. I'd be wrong if Qodo's absence on
bsuite#3279 is a one-off (rate limit, transient error) rather than the standing #1883 gap —
worth watching one more bsuite PR before concluding it's systemic, though #1883 itself has
stood open with the same symptom since 2026-08-24.

---

### 4. `is_platform_admin(uuid)` — drop it, or keep it and reconcile crm7's test

**Situation.** Production carries a database function, `is_platform_admin(uuid)`, that
business-suite-unified depends on. crm7's own pgTAP test suite (test 55) asserts this function
does **not** exist — false against production today, though the test never runs against
production so the contradiction has never surfaced as a CI failure. bsuite#1833 (closed
2026-08-08) already ruled that platform-scope authority should converge onto a single
predicate, `is_platform_developer()`; crm7 was built to that ruling and dropped
`is_platform_admin` as "converged away." business-suite-unified independently re-created it
afterward.

**Evidence.** From `closure-sweep/audit/bsuite-3144.md` (dated 2026-09-15, production read via
SELECT-only catalog queries that day — **not re-verified live by me this session**, no database
access under this task's rules): 0 policies reference `is_platform_admin` anywhere in
production; 0 function bodies call it; 0 `pg_depend` dependents; 0 call sites across all six
apps' source trees. The function's live comment and body are byte-identical to
business-suite-unified's `20260929000000` migration, which argued the function had "eight real
callers" — a claim business-suite-unified's own later migration (`20260920000000`) contradicts,
recording it "is referenced by 0 policies... has never been the RLS predicate in this estate."
Both migrations are business-suite-unified's own, six days apart, and disagree with each other.

**Options.**
- **(a) Drop it** — ship a guarded, dependency-checked business-suite-unified migration
  removing `is_platform_admin(uuid)`, the same shape crm7 used (`20260809043000`),
  collision-checked across all six scopes. Cost: none identified — zero live dependents means
  nothing currently calls it; forecloses only a function nothing uses.
- **(b) Keep it and reconcile crm7's test 55** to accept its existence. Cost: the test then has
  to explain why a "converged-away" function is still live, undermining the 1833 convergence
  for future readers, and does nothing to explain why business-suite-unified disagrees with
  itself between its own two migrations six days apart.

**Precedent.** bsuite#1833 already ruled the general principle — one predicate,
`is_platform_developer()`, replaces the fragmented admin-tier checks. This extends that ruling
by a 1:1 ratio to the one function business-suite-unified re-created against it. Nothing since
1833 has un-ruled that principle.

**Recommendation.** Drop it. Zero live dependents and an existing convergence ruling both point
the same way; keeping it only preserves a contradiction between business-suite-unified's own
two migrations for no measured benefit. I'd be wrong if there's a near-term
business-suite-unified feature already designed against `is_platform_admin` specifically
(rather than `is_platform_developer`) that this brief hasn't found — the zero-call-site count is
from `origin/main` on all six apps as of 2026-09-15, not from any in-flight branch.

---

### 5. Who gets access to what under the portal-account RLS rewrite (crm7#2641, Q1–Q7)

**Situation.** Production's row-level security treats any active membership of an
organisation as staff-equivalent access, because the shared helper `auth_tenant_id()` returns
every active membership with no role filter. FutureBuild — a paying client — has one apprentice
portal account and one host-contact portal account live in production today. Under current
policy, that apprentice account can read in full 252 of 316 probed tenant tables (including
other people's dates of birth, disability and Indigenous status, and the organisation's Xero
access token) and can write to 100 of them and delete from 94, all through the ordinary API,
with no cross-tenant leak (a member of a different organisation reads 0 rows everywhere on the
same probe). This is filed as crm7#2641 (P0, security), with a prototyped and rehearsed fix
not yet applied, and it carries seven questions for you.

**Evidence.** crm7#2641 is open, filed 2026-09-15; its body was confirmed live this session to
carry exactly the Q1–Q7 list below. Underlying numbers are from the read-only portal-member-rls
lane (`readonly-batch4/portal-member-rls/issue_draft.md`, 2026-09-15): production reads via
SELECT-only queries plus a disposable Postgres 17 replica carrying production's policy and
helper-function text, fingerprint-matched (policy text on 319 tables: one hash; 38
helper-function bodies matched row by row, including security-definer/volatility/search_path).
**Not re-run by me this session** — no database access under this task's rules — cited from that
dated evidence, not re-derived today.

**Options.** One ruling, seven sub-parameters, all shipping together in one migration
regardless of how each is answered — each line below states the choice and its cost, with my
recommendation marked:

- **Q1 — who counts as staff for the rewritten helper.** *Recommend:* owner, admin, manager,
  staff, plus `field_officer` and `field_manager` (already staff-grade under D-93 and the
  Tier-1 licensing ruling for site-visit recording). Not `training_provider`, not viewer (see
  BSU#829), not `grant_restricted` (0 holders today). A narrower answer costs field officers
  read access they already have through staff screens; a wider one re-opens the exposure this
  issue exists to close.
- **Q2 — `billing_cycles` / `rate_adjustments` name `'guest'` but not `'staff'`.** *Recommend:*
  owner and admin only — this reads as an oversight (a portal role granted where staff wasn't),
  not a deliberate design; no other financial table follows the pattern.
- **Q3 — the 74 configuration/reference tables.** *Recommend:* keep app-shell, picklists,
  content and reference-qualification tables readable by all members (not information about a
  person); make report catalogues, role/permission tables, workflow definitions, interpretation
  and pay rules, quotas, tenant settings, email templates and custom rate configurations
  staff-only. Leaving all 74 open lets a portal account read the organisation's custom rate
  configuration and workflow definitions — arguably worse than the person-data exposure this
  issue centres on, since it's commercially sensitive rather than personal.
- **Q4 — worker self-service beyond what's scoped.** *Recommend:* own pay history and own
  induction records, yes; guardian consents and LLN, staff-only. The worker portal already
  queries pay history and gets nothing today — a dead code path, not a new grant.
- **Q5 — host scope.** *Recommend:* own-host charge-rate quotes and snapshots, yes (matches the
  existing "view charges + billing for their placements" permission text); documents, only when
  explicitly shared (restates your own bsuite#3208 ruling on confidential HR records, not a new
  position); leave balances and training plans, no.
- **Q6 — a host contact with no `org_members` mapping.** *Recommend:* fail closed, rather than
  falling back to the organisation's oldest employer (what `useHostEmployerId` does today) —
  that fallback is a bug independent of this rewrite, not a design worth keeping.
- **Q7 — canonical person link.** *Recommend:* `people.user_id` (what `portal_invite_accept`
  actually writes), while still accepting `contact_id` as a fallback. Today a `user_id`-linked
  apprentice sees an empty portal because two lookup pages check `contact_id` only — a bug fix
  riding with the rewrite, not a new judgment call.

**Precedent.** The 2026-08-25 licensing/personas ruling (Tier 1) already states the principle
this fix implements: "`portal_role` is the persona and experience axis... authority is `role`
plus RLS... every external portal user MUST be `role='guest'`." The bug is that RLS was never
built to enforce that — every one of Q1–Q7 applies this same principle to a specific table
group, not a new policy. The book is not silent on the shape of the answer; it is silent only
on the specific boundaries (which financial tables, which self-service scope) Q1–Q7 ask you to
draw.

**Recommendation.** Adopt the recommended answer on all seven as a single ruling on this issue.
This closes the exposure at the point the existing persona ruling already set, without
inventing new policy. I'd be wrong on Q3 specifically if any of the 74 tables needs to stay
all-member-readable for a workflow this brief hasn't traced — worth a second look at
`report_catalog_*` in particular, in case some report definitions are meant as templates every
member customises rather than staff-only configuration.

---

### 6. Whether field officers and field managers may edit contact, placement and training-assessment records in their own caseload (bsuite#2411)

**Situation.** crm7's `role_capabilities` table currently grants 34 write permissions the
application code denies — a gap grown from 28 to 34 since first measured. Of those, 18 revoke
cleanly under rulings already on record. Six remain, all on one fork: may a field officer or
field manager edit contact details, placements and training assessments for the apprentices in
their own caseload?

**Evidence.** `triage-2.md` (2026-09-15): 0 users hold either role in production, measured that
day — nothing changes for FutureBuild regardless of your answer. The `20260905000000` reader
migration that resolves "caseload" is applied (confirmed in the production ledger as of that
read), but nothing currently calls it — 0 policies reference the caseload resolver; it's used
only by a calendar check and a display wrapper.

**Options.**
- **(a) Yes**, limited to their own caseload by the database, with tenant admins able to switch
  it off. Cost: none today (0 role-holders), but sets the principle for whenever either role is
  actually assigned.
- **(b) No** — revoke the six alongside the eighteen already settled. Cost: field officers and
  field managers, once assigned, can record site visits and competency (already permitted) but
  cannot correct the record they're looking at while doing so.

**Precedent.** The Tier-1 GTO licensing ruling already settles that field officers and field
managers are staff, and the database already scopes them to a caseload. What it doesn't settle —
and what makes this yours, per a 2026-09-11 ruling forbidding new grants purely from table
structure — is which records a caseload-scoped staff member may change. This is a ratio
question: crm7 already lets field managers edit people and placements generally, and lets
field officers edit apprentices; this asks whether the same authority extends from the general
case to the caseload-scoped one.

**Recommendation.** Yes. It matches the staff classification already made, costs nothing today,
and closes a gap that would otherwise surface as a complaint the first time someone is assigned
either role. I'd be wrong if field officers are meant to be read-only observers who escalate
corrections to a manager — nothing in the licensing ruling says that, but it's operational
intent only you'd know.

---

### 7. Replace the document-encryption master key (crm7#1130, item a)

**Situation.** Every encrypted document on the platform (50 total, 22 FutureBuild's) is
protected by one master key stored in Supabase Vault. Supabase lets you set a secret but never
read it back, so the only copy of today's key exists nowhere you can back it up. The key went
missing once already (found absent 2026-07-14). A second loss makes all 50 documents
permanently unrecoverable — 22 of them a paying client's.

**Evidence.** From `triage-4.md` (2026-09-15): each organisation has its own key, wrapped by
the one master key, so the swap re-wraps 2 key rows, not the documents. An agent can rehearse
the re-wrap on a local stack and keep the old wrapping valid until every one of the 50 documents
is proven to open, before and after. **This count (50 documents, 22 FutureBuild) is cited from
that dated triage pass, not re-verified by me this session** — no database access under this
task's rules.

**Options.**
- **(a) Do the swap now:** you receive and store the new key, an agent re-wraps both
  organisation keys and proves all 50 documents open before and after. Cost: your time to store
  one key, plus the small, rehearsed-first operational risk of the re-wrap.
- **(b) Leave it as is.** Cost: you're accepting, indefinitely, that a second loss of the
  vault-stored key permanently destroys 22 of FutureBuild's documents with no recovery path —
  an irreversible loss on a paying client's records, for no offsetting benefit.

**Precedent.** None directly on point — the book has no ruling on accepting irreversible
key-loss risk. What makes this yours rather than an agent's is a boundary you've set and not
delegated: decisions touching another company's data. The master key wraps FutureBuild's
organisation key, so this falls inside that boundary on the plainest reading, even though the
mechanical work is agent-executable.

**Recommendation.** Do the swap. The risk of doing nothing (permanent, irreversible loss of a
client's documents) is categorically worse than a rehearsed key swap with a before/after proof
on every affected document. I'd be wrong if the current no-backup state is deliberate — for
instance, a business-continuity kill switch — but nothing in the record suggests that; it reads
as an oversight found in July and not yet corrected.

---

### 8. Commission or defer the document-retention destroyer (bsuite#2619, with #3031's award-rates pair as a sequencing note)

**Situation.** `document-retention-sweep-daily` is a scheduled job that, once armed,
permanently deletes documents past their retention date under Australian Privacy Principle
11.2. It has failed 9 of 9 runs since creation, because two vault secrets it depends on were
never seeded (bsuite#3031's runbook). The last real measurement of what it would delete was
2026-08-28 — zero rows, now stale. Seeding those two secrets arms the destroyer with no preview
step.

**Evidence.** bsuite#2619, open, last comment 2026-09-10 on your own account, records that a
zero-row backlog on 2026-08-28 does not license arming a standing destructive capability, and
that no dry-run exists. **This session did not query the production document backlog or the
vault** — no database access under this task's rules — the staleness above is arithmetic from
the dated comment, not a fresh count. Watchdog bsuite#3015 is separately open; its comments
today concern a different discrepancy (a job-count mismatch) and neither confirm nor refute
whether these two specific jobs still fail.

**Options.**
- **(a) Seed the vault secrets now**, let the daily sweep run as designed. Cost: the next
  scheduled run becomes a standing, unpreviewed destroyer — if the backlog has grown since
  August and includes anything that shouldn't be destroyed, there's no report-only step to
  catch it first.
- **(b) Build a report-only mode first** (a same-day count and earliest-eligible-date, by
  tenant and category, posted where you can see it before anything is armed), then decide.
  Cost: a short delay — hours, not days, since the sweep function already exists and only
  needs a preview branch.
- **(c) Leave the job permanently deactivated**, keep only the non-destructive backlog-check
  half. Cost: the platform never enforces APP 11.2 retention limits, a compliance gap on the
  record.

**Precedent.** The 2026-08-26 ruling on FutureBuild's 20-row ratification states plainly that a
one-time, tenant-specific approval is not standing authority to write to a client tenant
generally — here the ratio runs the other way from most items in this brief: rather than
extending a principle, this is about *not* extending a narrow, already-ruled exception into a
platform-wide recurring power. The "wire it or remove it, no third state" rule argues for
eventually commissioning it, but says nothing about skipping the preview step to get there.

**Recommendation.** Build the report-only mode first. It's cheap, and it turns "commission or
defer" into a decision on a fresh, visible number instead of a 19-day-old zero. Once you see a
same-day count, either commission the sweep or unschedule it with real information. Separately,
the award-rates vault pair (#3031's other half, unrelated to retention) can be seeded once its
own pre-flight check runs — that's routine and doesn't need to wait on this. I'd be wrong if the
platform-wide retention obligation is time-critical enough that even a short report-only delay
creates its own compliance exposure — nothing in the record suggests that, but it's a legal
judgment more than an engineering one.

---

### 9. What happens to the 44 stale host-monthly-pack deliveries, 7 of them FutureBuild's (crm7#477)

**Situation.** crm7's scheduled report-delivery system has never actually delivered anything —
the cron job that should call the delivery function doesn't call it, so every queued delivery
sits at `pending` forever. 44 such rows exist today, all host-monthly-pack reports, created
between 1 July and 1 September, across 4 tenants. Seven belong to FutureBuild, pending since
1 August. If the delivery mechanism is fixed and simply told to drain the backlog, those seven
emails go out today, two months late, to FutureBuild's host employers.

**Evidence.** `closure-sweep/audit/crm7-477.md`, dated 2026-09-15, production reads via
SELECT-only catalog queries that day: `report_deliveries` = 44 rows, all `pending`,
`triggered_by='schedule'`, template `host_monthly_pack`, 0 started, 0 sent, 0 with a file, max
retry 0; FutureBuild holds 7. **Not re-verified by me this session** — no database access
under this task's rules; cited from that dated audit, not re-derived.

**Options.**
- **(a) Fix the mechanism and drain the full backlog**, including FutureBuild's seven. Cost:
  FutureBuild's host employers receive packs roughly six to eight weeks stale, with no
  explanation — a live client-facing communication you haven't reviewed.
- **(b) Fix the mechanism but cancel the 44 stale rows** rather than sending them; only
  newly-generated packs go out from here. Cost: those host employers never receive the
  July/August packs at all, though a current one follows on the normal cycle.
- **(c) Fix the mechanism; hold FutureBuild's seven for your review** (a short note about the
  delay, or a manual regeneration with current data), let the other 37 drain normally. Cost:
  slightly more manual handling for one client, but avoids emailing a stale pack to a paying
  client without any input from you.

**Precedent.** The book has no ruling on stale-delivery drainage specifically. What makes this
yours is the same boundary as decision 7 — this reaches FutureBuild, and the standing
FutureBuild directive ("aggregate counts only, no writes, no fixtures" for any automated read)
plus the "another company's data" boundary both point at pausing before an automated system
emails a live client on your behalf.

**Recommendation.** Fix the mechanism (unambiguous and overdue regardless), and hold
FutureBuild's seven specifically for a quick decision from you while the other 37 drain
normally. This respects the FutureBuild boundary without leaving the whole backlog stuck. I'd
be wrong if two-month-old host packs are genuinely harmless to send late with no comment — you'd
know that from the relationship, this brief doesn't.

---

### 10. Did placement 476aa0f9's host really change on 26 August, or was it a correction back to the same host

**Situation.** A migration is prepared (not yet run) to move FutureBuild's eight placements
onto the newly built Apprentice Placement workflow, preserving every completed step as evidence
rather than restarting onboarding from scratch. Seven of the eight migrate cleanly. The eighth,
`476aa0f9`, was terminated on 24 August and reactivated two days later with a different
`employer_id` — but its only charge-rate quote and rate snapshot still name the previous host.
The migration packet needs one fact from you: did the 26 August change correct the placement
back onto its real host, or does it genuinely have a new host the quote and snapshot haven't
caught up to?

**Evidence.** `security-row-packets/futurebuild-migration/design/design.md` (pass 2, receipts
2026-09-15): the packet's own text says "Braden says the 26 August change corrected the same
host's record" — but no timestamp, message or issue comment is cited behind that line; it reads
as a paraphrase of something said outside the recorded evidence trail. The same document's
precondition table still lists "Braden's answer... is known" as an open requirement, gated on
"his message" selecting which file to run — meaning the packet's own authors did not treat that
paraphrase as sufficient to proceed without a fresh, explicit answer. **I am flagging this as
unverified rather than asserting either reading.** Separately, and unrelated to this specific
fact: the whole migration is also gated on BSU#1233 being live in production (it is not —
merged only to business-suite-unified's own development branch, now further extended by PR
business-suite-unified#1255, open today), so this migration cannot run this week regardless of
your answer here.

**Options.**
- **(a) NEW_HOST (the packet's default):** the placement's host really changed on 26 August;
  the migration leaves all nine host-related onboarding steps outstanding for the current host,
  and the run waits at the quoting step rather than the portal step. Cost: none to data — the
  conservative default, recording only what the CRM already shows.
- **(b) SAME_HOST:** the 26 August change was a correction, not a real host change; the
  migration records `476aa0f9` exactly like the other seven (host steps complete, run waits
  only at the portal step). Cost: if wrong, the migration marks host onboarding steps
  "complete" for a host that was never actually onboarded — a false positive on a live client's
  record, in the direction the packet is built to avoid.

**Precedent.** None — this is a fact only you know, not a policy question. The packet correctly
treats it as needing your specific answer rather than inferring one.

**Recommendation.** Confirm which it was, in writing, so the packet's own precondition can be
marked satisfied rather than inferred from an unattributed line. Until BSU#1233 reaches
production (in progress via PR #1255) this doesn't block anything else, so there's no urgency
beyond making sure the eventual migration run doesn't rely on a paraphrase. I'd be wrong if you
did give this answer somewhere this brief can't see (a message outside the repositories and
issue trackers) — if so, the fix is pointing the packet at that record.

---

### 11. How to remove the white focus-ring literal from business-suite-unified's production CSS (BSU#1173)

**Situation.** Production's built CSS still contains the literal Tailwind default
`--tw-ring-offset-color:#fff`, both inline and in an `@property` declaration — the exact
literal this issue was filed to remove. Twenty-nine focus-visible call sites across twelve
source files set a non-zero ring-offset width with no offset colour of their own, so on
keyboard focus they resolve to that white default. One of the twenty-nine is the "Skip to main
content" link — the first Tab stop on every page, authenticated and public.

**Evidence.** `closure-sweep/audit/business-suite-unified-1173.md`, dated 2026-09-15:
production stylesheets fetched and hashed that day (matched to the deployed commit via
`version.json`) show the literal present once in the entry chunk and in the `@property`
fallback; 29 call sites in 12 files identified by source grep with surrounding context checked.
**Not re-fetched by me this session** — no browser access under this task's rules; cited from
that dated audit. The issue carries a comment from your own account narrowing the finding to
"cleared on computed live evidence," but the audit found no artefact behind that comment (no
browser measurement of the actual focus-state paint exists anywhere it searched) and found
contrary static evidence (the 29 sites above) the narrowing didn't account for.

**Options.**
- **(a) Fix each of the 29 sites individually**, giving each an explicit non-white offset
  colour. Cost: the most surface area, and the Tailwind literal itself remains in the built CSS
  regardless (it's generated whenever any `ring-*` utility exists at all), so the issue's own
  literal DoD criterion still fails after this fix.
- **(b) Set one site-wide default ring-offset colour.** Cost: less surface area, same problem —
  the underlying literal persists regardless of what any individual site sets.
- **(c) Move focus-visible treatment to the spec's own already-written rule** —
  `outline: 2px solid var(--focus-ring)` instead of a box-shadow ring — the only route of the
  three that removes the ring-offset machinery, and with it the literal.

**Precedent.** `docs/20260822-border-elevation-token-system-spec-v1.00F.md` §5.5 already states
the outline-based rule this issue's DoD requires, though it hasn't been fully applied to
focus-visible states specifically. This is a ratio-extension, not a new design: take the
already-written rule and apply it to the one class of element (focus rings) it hasn't reached
yet.

**Recommendation.** Option (c). It's the only route that satisfies the issue's own literal
acceptance criterion rather than working around it, and it's already the documented target —
this is finishing a decision already made, not making a new one. I'd be wrong if outline-based
focus rings are visually unacceptable somewhere box-shadow currently isn't (for instance, a
rounded element where an outline doesn't follow the border-radius cleanly) — worth a quick
visual check before committing, not a reason to prefer (a) or (b) outright.

---

### 12. Whether BSU's status-callout border needs to clear 3:1 contrast, or is decorative (bsuite#2621)

**Situation.** business-suite-unified's status callout borders (`--color-<role>-border`, used
on already-tinted, already-labelled status cards) measure 1.13:1 to 1.92:1 against a 3:1 WCAG
floor for graphical objects required to understand content. Separately, and not the same
question, JodieAI's mode-selection chips carry their selected state in colour alone, with no
`aria-pressed`.

**Evidence.** bsuite#2621, open, 0 comments, last updated 2026-08-31.
`business-suite-unified/src/index.css` still defines these borders as a 30% colour-mix in both
themes (confirmed live by today's nav-siblings file reads, though that lane's focus was
navigation, not this contrast question — **the contrast ratio itself was not re-measured by me
this session**). Precedent search (`triage-1.md`, today) returned only the incident record for
this class of finding, not a prior ruling either way.

**Options.**
- **(a) Rule the border decorative:** the callout already carries status through background
  tint and coloured text, so the border is a third, redundant signal. Cost: the 20 affected
  cells stop being a finding, though WCAG 1.4.11 technically still applies if the border is
  "required to understand" the status — a judgment call about whether background plus text
  already satisfies that.
- **(b) Raise the border's colour-mix percentage until it clears 3:1.** Cost: a token-level
  change in `@bsuite/theme` (to keep the five sibling apps aligned), verified against the
  existing 2026-08-28 twenty-cell baseline.

**Precedent.** Explicitly none — the book is silent on this fork. Nothing you've ruled
elsewhere distinguishes a redundant decorative border from a required one.

**Recommendation.** Decorative, for the callouts specifically — background tint plus text label
already carries the status without relying on the border, unlike a case where colour is the
only signal. The JodieAI chips are a different, already-decided class of problem (a control's
selected state needs a non-colour signal regardless of contrast ratio) and should be fixed
either way, independent of this ruling. I'd be wrong if a specific accessibility conformance
level you've committed to in writing treats every coloured border as "required to understand"
regardless of redundancy — worth confirming before treating this as settled.

---

### 13. Disconnect the permanently red Supabase Preview check on bsuite main (bsuite#2620)

**Situation.** Every push to bsuite main runs a GitHub check called "Supabase Preview," tied to
the Supabase-GitHub integration on the production project. It has never once passed — it fails
because the parent bsuite repository doesn't apply migrations directly (that happens
per-submodule, through a different, diff-driven pipeline). The check isn't required for
merging, but it sits on every commit permanently red.

**Evidence.** bsuite#2620, open, last updated 2026-08-31. GraphQL check-run read on main's
current tip, commit `a99ba313` (2026-09-08): app `supabase`, check name "Supabase Preview,"
`COMPLETED`/`FAILURE`. This is a live state, confirmed via the same query used for today's
other checks in this brief, not carried from an old snapshot.

**Options.**
- **(a) Disconnect the integration from the parent repository entirely.** Cost: none identified
  — it has never once succeeded, and the actual migration pipeline doesn't depend on it.
- **(b) Point it at a real migrations path.** Cost: there isn't one in the parent repository to
  point it at — migrations live in each app's own submodule, so this option has no concrete
  implementation.
- **(c) Leave it as is.** Cost: a permanently red check trains anyone watching CI to ignore red
  Supabase checks, which is exactly the failure mode a genuine Supabase problem would then hide
  behind.

**Precedent.** The estate's own standing rule — a permanently failing check is a third state
neither "working" nor "removed," and should be resolved one way or the other. This applies
directly; no ratio-extension needed.

**Recommendation.** Disconnect it. There's no working alternative configuration, and leaving it
red degrades whoever reads bsuite's CI status. This doesn't touch any of the six apps' own
Supabase integrations, if any of them has the same misconfiguration — that's a separate
decision this brief hasn't checked. I'd be wrong if the Supabase project dashboard itself
(separate from the GitHub check) relies on this integration for some other function — worth a
quick look at the project settings before disconnecting, since only the GitHub side was
checked here.

---

### 14. Authorise Jodie's GitHub App, as its own App rather than an extension of the existing automation App (bsuite#557)

**Situation.** Jodie's triage/automation package is built and published but has no event
source — it needs a GitHub App with a webhook receiver to fire. GitHub only lets the account
owner create an App, signed in, in a browser; no API path lets an agent do this instead.

**Evidence.** bsuite#557, open, 0 comments. A prior, never-merged pull request (#882) already
contains a working webhook receiver that can be salvaged. Your 2026-09-03 ruling already
settled that estate automation authenticates as a GitHub App rather than a personal token, and
a separate App (`bsuite-estate-automation`) was registered under that ruling and is already
installed on all seven repos.

**Options.**
- **(a) Create Jodie as its own App (`bsuite-jodie`)**, narrowly scoped. Cost: one more App to
  track, but Jodie's actions carry their own name in every audit trail, and a permissions
  problem with Jodie can't widen the blast radius of the existing automation App.
- **(b) Add Jodie's permissions to the existing `bsuite-estate-automation` App.** Cost: simpler
  to administer, but broadens that App's scope for an unrelated purpose (triage comments vs.
  lockfile/pointer automation) and muddies the audit trail — every action would appear to come
  from the same identity.

**Precedent.** Your 2026-09-03 ruling settles the identity question (App, not personal token);
it doesn't settle one-App-versus-many. The closest ratio is the existing automation App's own
narrow scope — it does one job under its own identity, which argues for extending that same
narrow-scope-per-purpose pattern to Jodie rather than consolidating.

**Recommendation.** A separate App. This is a one-minute signed-in action once the receiver and
manifest are ready (they aren't quite — the webhook queue and token cache still need building
from #882's salvage). Pre-authorising the separate-App approach now means the click isn't a
second bottleneck once that build finishes. I'd be wrong if you'd rather minimise the number of
GitHub Apps on the org for administrative simplicity — a reasonable preference this brief can't
rule out, it just isn't what the existing automation App's own design suggests.

---

## Already settled — not brought to you

- **throughput's top-nav marks the current page by colour alone** (0 occurrences of
  `aria-current` in its `src/`, confirmed today by the nav-siblings sweep). Not included: a
  one-line-per-link fix with no judgment attached, and the same fix already shipped today,
  uncontroversially, in the equivalent crm7 and business-suite-unified rail PRs (crm7#2643,
  business-suite-unified#1254) — settled by direct example, not by a ruling this needed from
  you. It belongs in ordinary code review.

- **business-suite-unified#916** (FutureBuild's Microsoft mailbox connection). Removed from the
  "needs you" list: `triage-5.md` (2026-09-15) found it **NOT_BLOCKED** on live production
  evidence — FutureBuild's mailbox is already connected (201 inbound emails, 1 sent, 0 errors,
  connected 3 September) — **not re-verified by me this session**. What's left (Microsoft
  publisher verification) is a prepared runbook for you to execute, not a question with
  options.

- **The other 34 rows of the 36-row blocked-ledger sweep.** 23 are stale — their named blocker
  is already gone or already answered by a recorded ruling, and the next step is agent work
  (`blocked-triage/synthesis.md` §1). 1 is a third party (conduit#425, waiting on SEEK's and
  Indeed's own onboarding process — your submission is needed but there's no fork to rule on;
  the recommendation, submit SEEK first, was already given on 2026-07-29). 2 are genuinely
  blocked on something other than you: bsuite#1322 (Sydney data-residency migration), parked on
  a procurement or contract trigger that hasn't fired, exactly as you ruled 2026-07-17;
  bsuite#1866 (point-in-time recovery), which is a stale-record problem — production already
  has 7-day PITR enabled, measured 2026-09-15, the issue and one doc just haven't been updated
  to say so. None of these 34 needed a place in this brief.
