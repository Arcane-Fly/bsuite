---
kind: record
authority: none
owner: bsuite
---

# 77 workflows fail their POST step on any lockfile-changing PR — setup-node caches a path nothing creates

https://github.com/GaryOcean428/bsuite/issues/3150

Snapshot updatedAt: 2026-09-07T09:49:18Z. Open at capture; re-read live.

## The failure

`control-boundary-contrast` on crm7#2537 and business-suite-unified#1187 is red. The gate itself **passed**:

```
control-boundary-contrast ratchet ok: baseline 5, scanned 2205.
```

The failing step is `Post Run actions/setup-node@v5`:

```
##[error]Path Validation Error: Path(s) specified in the action for caching do(es) not exist, hence no cache is being saved.
```

A red check that says nothing about the code it gates.

## Why only on lockfile PRs

`actions/setup-node@v5` resolves a cache key from the lockfile. These workflows deliberately run **no install** — `control-boundary-contrast.yml` says so in its own comment: *"No `pnpm install` step: the gate script below imports only node: builtins, so there is nothing to install."*

On an ordinary PR the cache key already exists, restore succeeds, and the post step has nothing to save. On a PR that **changes `pnpm-lock.yaml` the key is new**, so the post step attempts a save, finds no store directory, and errors.

Evidence it is branch-shaped rather than random — every recent run of that workflow in crm7:

| run | branch | result |
| --- | --- | --- |
| 34106545891 | `chore/lockfile-reach` | **failure** |
| 34106409141 | `development` | success |
| 34106221660 | `chore/lockfile-reach` | **failure** |
| 34105898472 | `fix/quarantine-host-supervisor-scope-rep` | success |
| 34103453595 | `fix/quarantine-host-supervisor-helper-un` | success |
| 34103063395 | `chore/refresh-schema-baseline-20260907` | success |

## The class — 77 workflows

Workflows that use `actions/setup-node`, run **no** install step, and set **no** explicit `cache:`:

| scope | count |
| --- | ---: |
| bsuite (parent) | 65 |
| crm7 | 6 |
| conduit | 2 |
| business-suite-unified | 2 |
| throughput | 1 |
| braden | 1 |
| **total** | **77** |

```sh
for f in <each workflow>; do
  body=$(sed 's/#.*$//' "$f")            # comments STRIPPED — see below
  echo "$body" | grep -q 'actions/setup-node' || continue
  echo "$body" | grep -qE 'pnpm install|npm ci|npm install|yarn install' && continue
  echo "$body" | grep -qE '^\s*cache:' && continue
  echo "$f"
done
```

**The comment-stripping is load-bearing, and I got this wrong first.** My initial scan returned **49** and did not contain `crm7/control-boundary-contrast.yml` — the one workflow I already knew fails. The reason: line 35 of that file reads *"No `pnpm install` step"*, and a grep for `pnpm install` matched the comment saying there isn't one. A class scan that cannot see its own positive control is not a measurement; the corrected predicate finds the control and the count rises 49 → 77.

**`.github/workflows/branch-protection-drift.yml` — which I added today — is in the 77.**

## Blast radius today

Not blocking: `control-boundary-contrast` is **not a required context** on `main` or `development` in either crm7 or business-suite-unified (checked all four). It is noise on a red tick, not a merge blocker. But it is noise that trains people to ignore a red gate, and it will fire on every future lockfile bump across 77 workflows.

## Not verified

I have **not** confirmed from the `actions/setup-node@v5` source or docs that it auto-enables caching from `packageManager` in `package.json`. The branch-correlation above is strong and the error text is explicit, but the precise trigger inside the action is inferred. Someone should read the action before writing the fix, so the fix is not aimed at a mechanism nobody checked.

Refs: crm7#2537, business-suite-unified#1187, run 34106545891
