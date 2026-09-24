---
kind: standard
authority: engineering
owner: bsuite-platform
evidence:
  - scripts/check-required-contexts-producible.mjs
  - .github/workflows/guard-self-reporting.yml
  - .github/required-contexts-baseline.json
---

# Branch protection dumps — the before-state of every protection write

Each `docs/security/branch-protection/<repo>/<branch>-<YYYYMMDD>.json` is the **verbatim**
body of `gh api repos/GaryOcean428/<repo>/branches/<branch>/protection`, taken **before** a
write in the PR that made the write. `<repo>` is the estate's seven repositories — `bsuite`
(the parent) plus the six `.gitmodules` submodules: `crm7`, `business-suite-unified`,
`conduit`, `braden`, `throughput`, `R80.4`. Since 2026-09-19 (bsuite#3141) every repo has its
own directory: the old flat `<branch>-<date>.json` scheme collided across repos, because every
repo has a `main`. A `rulesets/` sibling (bsuite#3199's ruleset dumps — a different mechanism)
lands separately and is invisible to the drift gate either way.

They exist for three reasons, each with an incident behind it.

## 1. The rollback has to be in history, not in scrollback

Branch protection is not in the repository. Its only record used to be whatever the person
who changed it happened to paste into a PR comment, and by the time anyone needed to undo a
change that person's terminal was gone. A dump committed in the same PR as the write means the
revert is `git show`-able a year later by someone who was not there.

## 2. Contexts are APPENDED with POST, never replaced with PUT

```sh
S=$(mktemp -d)

# 1. dump the before-state
gh api repos/GaryOcean428/bsuite/branches/<branch>/protection > "$S/before.json"

# 2. CORRECT — appends, leaves the other contexts alone.
#    The body is a JSON array passed with --input. See the two wrong forms below.
cat > "$S/body.json" <<'JSON'
{"contexts":["<exact context string>"]}
JSON
gh api --method POST \
  repos/GaryOcean428/bsuite/branches/<branch>/protection/required_status_checks/contexts \
  --input "$S/body.json"

# 3. re-read and diff — the write is NOT done until REMOVED is empty
gh api repos/GaryOcean428/bsuite/branches/<branch>/protection > "$S/after.json"
python3 - <<'EOPY'
import json, os
S = os.environ["S"]
b = json.load(open(f"{S}/before.json"))["required_status_checks"]["contexts"]
a = json.load(open(f"{S}/after.json"))["required_status_checks"]["contexts"]
print(len(b), "->", len(a))
print("ADDED  :", [c for c in a if c not in b])
print("REMOVED:", [c for c in b if c not in a])   # MUST be []
print("order preserved:", a[:len(b)] == b)        # MUST be True
EOPY
```

`DELETE` on the same endpoint, same body shape, removes a context — that is the rollback.

**TWO WRONG FORMS, both of which look like they worked:**

- **`PUT`** replaces the whole list. Appending one context by `PUT` has erased the other
  twenty-nine here before.
- **`-f 'contexts[]=<ctx>'`** exits 1, writes **nothing**, and prints an empty body. Measured on
  2026-09-03 (bsuite#2988): the call "failed" so quietly that only re-reading the protection
  object showed main still had exactly 30 contexts. `gh`'s `-f` builds a form field, not the JSON
  array this endpoint wants. Never use it here — for `POST` or `DELETE`.

Every write is followed by a re-read and a diff against the dump: only the appended contexts may
differ, in the original order, with every other field of the protection object byte-identical.

**Never append a context that is red on the PR making the append.** Merge the base in first and
let that PR's own run of the context be the proof; a context appended while it is failing can
deadlock the very PR that records the append.

The strings are **exact**, including capitalisation, punctuation and the em dashes some of them
carry. A context is the JOB's `name:` — or the job ID when the job has no `name:`, which is why
`gates` and `no-prerelease-in-production` sit in the list under bare job IDs while everything
else is a sentence. A matrix job reports as `name (values)`, so its bare name is not a context
anyone can produce.

## 3. A required context nobody can produce blocks every merge, silently

GitHub does not start a workflow whose `paths:` the pull request's changeset misses, so the
context never reports and the PR waits forever on "Expected — waiting for status to be
reported" with every visible check green. A job-level `if:` that evaluates false reports
SKIPPED, and SKIPPED does not satisfy a required context either. A job renamed out from under
a context string still sitting in protection does the same thing.

`scripts/check-required-contexts-producible.mjs` reads **these files** — never the live API, so
it needs no token — and fails the build when any required context is unproducible,
path-filtered, `if:`-gated, or scoped to a branch it is not required on. It reads the **bsuite
namespace only** (`bsuite/<branch>-<date>.json`): its job index is this repo's workflows, and
another repo's required context is unanswerable here. It runs on every PR
inside the `LANE-WATCHER — every guard states what it examined` job, which is itself required
on both branches. Prove it can fail with `node scripts/check-required-contexts-producible.mjs
--self-test` (11 cases, one planted defect or one positive control each; the count is the script's own summary line).

## What these dumps do NOT tell you

- **Whether they still match live protection.** A protection write made outside a PR leaves
  the newest dump stale, and the gate above cannot see that: it compares workflows to the
  committed file, not to GitHub. Re-dump in the PR that writes protection. That is the whole
  convention.
- **Anything about rulesets — that is now banked and gated separately.** `repos/<owner>/<repo>/rulesets`
  is a second, independent mechanism — as of 2026-09-03 the `default` ruleset re-requires
  `build-and-test` and `DOM Layout Invariants` on the default branch on top of classic
  protection, and the `development` ruleset requires no status checks at all. Ruleset-level
  required checks are configured through a different API and are not in these files: they
  are banked in [`rulesets/`](./rulesets/) and watched by `scripts/check-ruleset-drift.mjs`
  (bsuite#3165), nightly in the same workflow as this gate.
- **Whether a required gate is correct**, or can fail. That is each gate's own `--self-test`
  and the LANE-WATCHER entry that registers it.

## Linear history is OFF — ratified posture (bsuite#3165, ADR-0012 item 1)

**`required_linear_history` is not part of the desired posture on any repo in this estate.**
Classic protection on every `main` and `development` reports it `false`, and no ruleset
carries it — verified live 2026-09-19 across all seven repos, with the verbatim default-branch
rulesets banked in [`rulesets/`](./rulesets/).

Merge commits on `main` are **expected and protected** — by `non_fast_forward` (both layers)
plus required status checks, not by linear history. The estate promotes with
`gh pr merge --merge` and never `--squash` or rebase, because those rewrite SHAs and the
promotion merge commit is the record that a development tree was promoted.

The history behind that ruling: from before 2026-09-07 the bsuite `default` ruleset carried
`required_linear_history` while classic protection did not, so every `development → main`
promotion was structurally unmergeable without `--admin` — merge commits landed *through*
the bypass (e.g. PR #3119), which was strictly worse than either policy it was choosing
between. The rule was removed from the ruleset on 2026-09-07 during the incident-restoration
window; ADR-0012 item 1 (operator decision register, 2026-09-16) ratified the removal.
`scripts/check-ruleset-drift.mjs` now fails if the rule reappears on any banked ruleset —
live presence fails even when a stale dump agrees. The last two promotions landed as merge
commits without `--admin`: PR #3148 (merge `2aeb253d`, 2026-09-07) and PR #3236 (merge
`88c9df9b`, 2026-09-18).

## Re-dumping

```sh
d=$(date +%Y%m%d)
# ONE repo:
for b in development main; do
  gh api "repos/GaryOcean428/bsuite/branches/$b/protection" \
    > "docs/security/branch-protection/bsuite/$b-$d.json"
done
# EVERY repo in the estate (parent + .gitmodules) — run after any protection
# write anywhere, and re-run nightly by the drift workflow on failure:
for r in bsuite crm7 business-suite-unified conduit braden throughput R80.4; do
  for b in development main; do
    gh api "repos/GaryOcean428/$r/branches/$b/protection" \
      > "docs/security/branch-protection/$r/$b-$d.json"
  done
done
node scripts/check-required-contexts-producible.mjs            # must be clean
node scripts/check-required-contexts-producible.mjs --update-baseline
node scripts/check-branch-protection-drift.mjs --self-test     # must be clean
```

The gate reads the **newest** file per repo×branch by the date in the filename; older dumps
stay because they are the rollback for the write that superseded them. The drift gate
(`scripts/check-branch-protection-drift.mjs`) derives the repo list from `.gitmodules` plus
the parent — a new submodule is picked up automatically, and until its dumps are committed
the nightly job FAILS with `dump-missing` rather than silently watching 12 of 16 branches.
`PROTECTION_REPOS` ("repos=A@dir,B" or bare slugs) narrows a run to a subset for bisecting;
out-of-scope dumps then warn instead of fail.

**Two writes on the same day** share one filename, so the before-state of the second is the
*previous commit of that file*, not a second file — `git log -p docs/security/branch-protection/`
is the record. That is what happened on 2026-09-03: the first commit of
`bsuite/main-20260903.json` (then `main-20260903.json` at the top level, moved into `bsuite/`
by bsuite#3141) holds the 30-context state before `align` and `Every gitlink sits on its app's
own main` were appended, and the second holds the 32-context state after.

## Restoring from a dump — exercised for the first time on 2026-09-07

Between 15:33 and 16:14 +08 on 2026-09-07, `main` and `development` both lost classic branch
protection outright. `main` went from 34 required contexts, `enforce_admins: true` and
`allow_force_pushes: false` to **no protection object at all** — production was force-pushable,
with no required check and no required review. The repository ruleset was edited in the same
window: it lost `non_fast_forward` and `required_linear_history`, and gained a ref pattern of
`refs/heads/"main", "development"` — one literal ref containing quotes and a comma, matching no
branch, which is the shape of a shell-quoting accident rather than a policy decision.

Nothing detected it. It surfaced by accident during an unrelated audit. Both branches were
restored from `main-20260906.json` and `development-20260906.json` — this directory's whole
reason for existing, and the first time it has been needed.

```sh
S=$(mktemp -d)
b=main   # or development

# Build the PUT body from the newest committed dump. The dump is the API's RESPONSE
# shape and the PUT wants a slightly different one: booleans rather than {enabled},
# and an explicit `restrictions` (null when the dump has no restrictions key).
python3 - "$b" > "$S/body.json" <<'PY'
import json,sys,glob,os
b=sys.argv[1]
f=sorted(glob.glob(f"docs/security/branch-protection/bsuite/{b}-*.json"))[-1]
d=json.load(open(f))
en=lambda k: bool(d.get(k,{}).get('enabled'))
json.dump({
 "required_status_checks":{"strict":d['required_status_checks']['strict'],
                           "contexts":sorted(d['required_status_checks']['contexts'])},
 "enforce_admins":en('enforce_admins'),
 "required_pull_request_reviews":{k:v for k,v in (d.get('required_pull_request_reviews') or {}).items() if k!='url'} or None,
 "restrictions":None,
 "required_linear_history":en('required_linear_history'),
 "allow_force_pushes":en('allow_force_pushes'),
 "allow_deletions":en('allow_deletions'),
 "block_creations":en('block_creations'),
 "required_conversation_resolution":en('required_conversation_resolution'),
 "lock_branch":en('lock_branch'),
 "allow_fork_syncing":en('allow_fork_syncing'),
}, sys.stdout, indent=1)
PY

gh api -i -X PUT "repos/GaryOcean428/bsuite/branches/$b/protection" --input "$S/body.json" | head -1

# VERIFY BY RE-READING. Do not trust the write: the first attempt on 2026-09-07
# printed a client-side "unexpected end of JSON input" and left the branch bare,
# and only the re-read caught it.
gh api "repos/GaryOcean428/bsuite/branches/$b/protection" \
  --jq '"contexts=\(.required_status_checks.contexts|length) admins=\(.enforce_admins.enabled) force=\(.allow_force_pushes.enabled)"'
```

Restoring is a **PUT of the whole object**, which is safe here precisely because the body is
built from the dump rather than typed by hand — the same PUT-replaces-everything property that
erased twenty-nine contexts once before is what makes it the correct restore verb.

### "Branch not protected" is two different answers

`GET /branches/{b}/protection` returns 404 both when protection is genuinely absent and when the
caller cannot see it. During this incident that 404 was very nearly reported as "protection was
removed" before a positive control — the identical call against `crm7`, which returned 200 —
proved the token could read protection where it existed. Consult the branch object before
concluding:

| protection endpoint | `GET /branches/{b}` says | reading |
| --- | --- | --- |
| 404 | `protected: false` | genuinely unprotected |
| 404 | `protected: true` | **ambiguous** — a ruleset, or a token without administration read. Not proof of removal. |
| any other error | — | the instrument failed; this is a claim about the token, not the branch |

### The watcher

`scripts/check-branch-protection-drift.mjs`, run nightly by
`.github/workflows/branch-protection-drift.yml`, compares live protection for EVERY estate
repo (`GaryOcean428/<repo>`, derived from `.gitmodules` plus the parent) against the newest
dump in its `<repo>/` directory here, and encodes the table above. **Weakening fails;
strengthening only warns** — a context added live and not yet re-dumped is a stale dump, and a
gate that fires on every legitimate protection write is one people switch off. Re-dumping
after a deliberate write clears the warning. A repo×branch with no committed dump FAILS as
`dump-missing` — the gate states its denominator rather than watching 2 of 14 branches while
rendering as green over all 14. The ruleset sibling, `scripts/check-ruleset-drift.mjs` (bsuite#3165), runs in the same
workflow over `rulesets/` and adds one absolute: `required_linear_history` present live fails
even when a dump agrees — see "Linear history is OFF" in `rulesets/README.md`.
