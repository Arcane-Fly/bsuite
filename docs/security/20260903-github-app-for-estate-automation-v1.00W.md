---
kind: standard
authority: operator
owner: bsuite
evidence:
  - .github/workflows/consumer-lockfile-reach.yml
  - .github/workflows/advance-submodule-pointers.yml
  - .github/workflows/migration-collision-across-open-prs.yml
  - docs/00-roadmap/operator-notes-verdicts.json
---

# GitHub App for estate automation (D-169)

**Status:** runbook, kind: procedure. Authority: operator ruling 2026-09-03 18:1x AWST ("API is legacy") recorded as
`precedent__bsuite__20260903__github_automation_authenticates_as_a_github_app_not_a_pat` (Tier 3). Evidence of the
defect it replaces: `.github/workflows/consumer-lockfile-reach.yml` wrote a lockfile commit through `PUT /contents`
under the personal access token `BSUITE_CROSS_REPO_PAT`; GitHub recorded the commit as unsigned; the workflow's own
guard refused to open the PR, three runs of three on 2026-09-03.

## What the operator does once (account action; the PI cannot do this)

1. GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App** (on the `GaryOcean428` account).
   - Name: `bsuite-estate-automation`. Homepage: the bsuite repository URL. Webhook: **inactive**.
   - Repository permissions: **Contents: Read and write**, **Pull requests: Read and write**, **Metadata: Read-only**
     (Metadata is added automatically). No organisation or account permissions.
   - Where can this App be installed: **Only on this account**.
2. After creation: **Generate a private key** (a `.pem` downloads). Note the **Client ID** shown on the App page.
3. **Install App** → select repositories: `bsuite`, `crm7`, `business-suite-unified`, `conduit`, `braden`, `throughput`,
   `R80.4`.
4. On the `bsuite` repository → Settings → Secrets and variables → Actions:
   - Variable `BSUITE_GITHUB_APP_CLIENT_ID` = the Client ID.
   - Secret `BSUITE_GITHUB_APP_PRIVATE_KEY` = the full contents of the `.pem` (newlines intact).
5. Tell the PI it is done. Nothing else changes by hand.

## What the workflows do from then on

`actions/create-github-app-token@v3` mints a short-lived installation token at the start of each cross-repo job
(`steps.app-token.outputs.token`), scoped to the seven repositories with `contents: write`, `pull-requests: write`.
While the variable is unset the step is skipped and the token expressions fall through to the PAT, so nothing breaks
before step 5; once the first App-authored commit reads `verification.verified = true` (the reach workflow already
checks this), the PAT fallback is deleted from the two writers and the PAT is revoked.

## Scope, measured 2026-09-03 18:18 AWST

| use | workflows | first |
|---|---|---|
| write (PUT /contents, `gh pr create`, `gh api POST /statuses`) | 3: `consumer-lockfile-reach.yml`, `advance-submodule-pointers.yml`, `migration-collision-across-open-prs.yml` | this PR |
| read (checkout of private submodules) | 61 | after the writers prove signed |
| app repositories | 0 | none |

Count reproduced by `grep -l 'secrets.BSUITE_CROSS_REPO_PAT' .github/workflows/*.yml | wc -l` (63) and by grepping
for `PUT`/`gh pr create`/`gh api --method POST .*statuses` (3). The third writer
(`migration-collision-across-open-prs.yml`, added by bsuite#3017) authenticates its `post-migration-collision-status.mjs`
step with `BSUITE_CROSS_REPO_PAT || github.token` to POST a commit status onto each app PR it judges — a write to a
different app repository than the one the workflow runs in, which is exactly the cross-repo shape this document is about.
