# Secrets & Vault Rotation — Operator Runbook

**Status:** W (Working)
**Audience:** Platform operator (Braden), not an agent
**Canonical env-var naming reference:** [`20260424-env-var-contributing-rules-v1.00W.md`](../20260424-env-var-contributing-rules-v1.00W.md) — read that first for naming; this runbook covers rotation mechanics and the live operator checklist
**CI enforcement:** `.github/workflows/secret-naming-drift.yml` (canonical env-var name drift), `.github/workflows/secret-scan.yml` (gitleaks)

This runbook does not contain, and must never contain, any actual secret value, token, or credential. Every rotation step below references the *name* of a secret and where it lives, never its contents.

## Where secrets live

| Store | Holds | Rotate via |
|---|---|---|
| Supabase project secrets (`tuybltdrdefjblnplpqo`) | Edge-function-only server secrets (e.g. encryption keys, third-party API keys used by edge functions) | `supabase secrets set --env-file <file> --project-ref tuybltdrdefjblnplpqo` (preferred — see note below) |
| GitHub repo/org secrets | CI credentials (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `BSUITE_CROSS_REPO_PAT`, etc. — see the header comments of `supabase-migrate.yml` and `supabase-functions-deploy.yml` for the exact list each workflow needs) | GitHub repo Settings → Secrets and variables → Actions, or `gh secret set <NAME>` |
| Vercel project env vars | Each app's build/runtime env, including its own copy of Supabase keys | Vercel dashboard → Project → Settings → Environment Variables, or `vercel env` |
| Operator password manager | The only durable copy of any secret whose only other home is a live system that doesn't let you read it back (e.g. a Supabase secret you can `set` but not `get`) | Manual — this is the step agents cannot do for you |

**Google Cloud is the one exception with no static key to rotate at all** — root `CLAUDE.md`'s Google Cloud Authentication section mandates Workload Identity Federation (WIF) for all Google API access from Supabase edge functions; static service-account JSON keys are banned outright. There is nothing to rotate there because there's no long-lived key in the first place — if you ever find a `.json` service-account key file or a `GOOGLE_APPLICATION_CREDENTIALS` pointing at one, that itself is the incident (delete it, confirm WIF is still the actual auth path in the consuming function).

## Canonical env-var naming (don't reintroduce retired names)

The Supabase key format is opaque publishable/secret keys (`sb_publishable_…` / `sb_secret_…`), not the legacy JWT-based anon/service-role keys. `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (and their `VITE_`/`NEXT_PUBLIC_` prefixed variants) are retired names — CI's `secret-naming-drift.yml` (via `scripts/check-secret-naming.sh`) fails a PR that reintroduces them, along with a handful of other drift patterns (Vite code reading `process.env.SUPABASE_*`, Next.js code reading `import.meta.env`, any `VITE_*`-prefixed secret that would ship to the browser bundle). See the full rule set and history in the linked env-var contributing-rules doc before renaming or adding anything — don't guess at a name.

**The one rule worth repeating on its own:** never prefix an actually-secret value with `VITE_` (or otherwise put it somewhere a Vite/Next.js client bundle reads it). `VITE_*` variables are inlined into the client bundle at build time and ship to every visitor's browser. The env-var contributing-rules doc records **one confirmed past incident** of this exact mistake — `VITE_STRIPE_SECRET_KEY` was found actually populated on BSU's Vercel env (no code reference, but a live exposed value; treat as compromised, delete + rotate) — plus **one latent naming risk that was caught before it became an incident**: `VITE_XERO_CLIENT_SECRET` is referenced in code but documented as "if ever populated, the Xero secret ships to browsers" — i.e. the dangerous name existed but the value was never confirmed populated. Both get the same remediation (move behind a server-only name, rotate on suspicion), but don't cite the Xero case as a second confirmed exposure — check the current state of both before repeating either claim, since the underlying doc may have been updated since this guide was written.

## Rotation procedure (general)

1. **Identify every place the current value is used** — grep the relevant app(s) for the env var name, and check both Supabase secrets and Vercel env vars if the same logical secret has copies in both places (a common failure mode: rotating the Supabase copy but leaving a stale Vercel copy that a different code path still reads).
2. **Generate the new value** using the appropriate method for that secret's type (e.g. `openssl rand -hex 32` for a symmetric key; the third party's own dashboard for an API key).
3. **Set the new value** in every store that holds it:
   - Supabase: prefer `supabase secrets set --env-file <file> --project-ref tuybltdrdefjblnplpqo` over the inline `supabase secrets set <NAME>=<value>` form — the inline form puts the secret value directly on the command line, where it lands in shell history and any process listing (`ps`, `history`) for as long as those retain it. Write the name/value pair to a short-lived file, run the `--env-file` form, then delete (or `shred`) the file. (Verified: `--env-file` is a real, currently-supported flag on the installed Supabase CLI — `supabase secrets set --help`.)
   - Vercel: update via dashboard or `vercel env add/rm`, then **redeploy** — Vercel env var changes do not take effect on already-running deployments.
4. **Vault a copy in the operator password manager** if the secret has no other durable, human-readable home (this is true of most Supabase-only secrets — `supabase secrets set` is write-only; there is no `supabase secrets get`). Reference the secret's *name* in any tracking issue, never its value.
5. **Confirm the consuming code path still works** against the new value before considering the rotation complete — a rotation that silently breaks the feature it protects is not done. For an encryption key specifically: confirm there is no existing ciphertext encrypted under the *old* key before rotating in place, or you will orphan it (see the `TENANT_MASTER_KEY` item below for exactly this check being done correctly).
6. **Revoke/deactivate the old value** at the source if the third party supports it (don't just stop using it — an old, still-valid key sitting unused is still a live credential).

## Live operator checklist (crm7#1130)

The current, tracked, real checklist — verify against `gh issue view 1130 -R GaryOcean428/crm7` for the latest state before acting, since items get ticked off over time:

- **(a) Vault `TENANT_MASTER_KEY`.** A fresh 64-hex-char key was generated and set via `supabase secrets set TENANT_MASTER_KEY=... --project-ref tuybltdrdefjblnplpqo` after discovering it was completely absent (the direct cause of the `document-encryption` edge function's 500s). Setting it fresh was safe because zero encrypted documents existed at the time (no orphaned ciphertext to lose access to). **The value exists only in Supabase secrets and was never echoed anywhere else.** Operator action: store a copy of the key value in the password manager. Losing it with no backup orphans all future encrypted documents.
- **(b) Rotate conduit's stale Vercel `SUPABASE_SERVICE_ROLE_KEY`.** Note the naming-drift angle here too: per the canonical naming rules above, this variable name itself is a retired legacy name (`SUPABASE_SECRET_KEY` is current) — rotating is a good opportunity to rename it correctly at the same time, not just refresh the value under the old name. Action: rotate/re-sync the key in the Supabase project scope conduit's Vercel env uses, update the Vercel env var, redeploy, confirm conduit still authenticates.
- **(c) Review document-category sensitivity/expiry flags** — tracked separately under crm7#1128; don't tick this off until that issue is resolved.

## Failure modes

- **A Supabase secret is missing and you can't tell what it used to be** → `supabase secrets set` is the only write path; there is no read-back. If the password-manager copy is also missing, you cannot recover the old value — you can only set a new one and accept the consequences for anything encrypted/signed under the old one (check for that exposure before rotating, as in the `TENANT_MASTER_KEY` example above).
- **Vercel env var updated but the app still behaves like the old value** → you forgot to redeploy; env var changes only apply to new deployments.
- **CI fails on `secret-naming-drift`** → you introduced (or the diff otherwise contains) one of the retired/forbidden name patterns; check `scripts/check-secret-naming.sh` and the linked contributing-rules doc for the exact rule that fired.
- **`gitleaks` fails on a PR** → a value that looks secret-shaped landed in a tracked file; do not just add an allowlist entry to `.gitleaks.toml` to make it pass — rotate the exposed value first, then decide whether an allowlist entry is even appropriate (the existing `autonoma-client-secret` rule in `.gitleaks.toml` is kept deliberately as a guard against reintroducing a specific retired integration's secret pattern, not as a general template for silencing findings).

## Related

- [`20260424-env-var-contributing-rules-v1.00W.md`](../20260424-env-var-contributing-rules-v1.00W.md) — full canonical naming rules and incident history
- Root `CLAUDE.md` "Google Cloud Authentication" — WIF policy (no static keys, ever)
- `gh issue view 1130 -R GaryOcean428/crm7` — live state of the operator checklist above
