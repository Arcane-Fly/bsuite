---
kind: record
authority: none
owner: bsuite
---

# [Ops checklist] Onboarding-360 operator actions — vault TENANT_MASTER_KEY, rotate conduit SUPABASE_SERVICE_ROLE_KEY, review doc-category flags

https://github.com/GaryOcean428/crm7/issues/1130

Snapshot updatedAt: 2026-08-24T03:26:26Z. Open at capture; re-read live.

## Onboarding-360 operator actions (2026-07-14 session)

Three operator-only follow-ups from the onboarding-360 pilot session that no agent can complete autonomously (password-manager access, credential rotation, domain judgment call).

- [ ] **(a) Vault the new `TENANT_MASTER_KEY` Supabase secret.** During the session, the docs-pipeline-fixer agent discovered `TENANT_MASTER_KEY` was completely absent from the `tuybltdrdefjblnplpqo` project's edge-function secrets (verified via `supabase secrets list --project-ref tuybltdrdefjblnplpqo` — ~61 secrets present, `TENANT_MASTER_KEY` not among them), which was the direct cause of the `document-encryption` edge function's 500s (pilot finding F14). A fresh 64-hex-char key was generated (`openssl rand -hex 32`) and set via `supabase secrets set TENANT_MASTER_KEY (value omitted) --project-ref tuybltdrdefjblnplpqo` (post-set secrets-list digest: `[omitted; original issue retains the historical digest]`). Setting it fresh was safe because SQL confirmed ZERO encrypted documents existed (no orphaned ciphertext). **The key value was never echoed to any output and is not committed anywhere — it currently exists ONLY in Supabase secrets.** Losing it orphans all future ciphertext for encrypted documents. Action: vault a copy of the key value in the operator password manager (name only referenced here — never the value). Source: WS-A report §2 / §9.4.
- [ ] **(b) Rotate conduit's stale Vercel `SUPABASE_SERVICE_ROLE_KEY`.** Known outstanding credential-hygiene item for the conduit app's Vercel environment. **Dedupe check performed before filing**: searched `GaryOcean428/conduit` (open + closed, multiple keyword variants: `SERVICE_ROLE_KEY`, `service_role`, `rotate credentials`, `vercel secret`, `env var stale`) and `GaryOcean428/crm7` / `GaryOcean428/business-suite-unified` — **no existing tracked issue found**, so this checkbox is the tracking record. Action: rotate the key in the Supabase dashboard scope used by conduit's Vercel env (or re-sync the current key if only the Vercel copy is stale), update the Vercel env var, and redeploy.
- [ ] **(c) Review document-category sensitivity/expiry flags** — see #1128 for the full flag list and rationale. Do not tick this box until #1128 is resolved.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: N/A code-wise — operator-actions checklist; each item is verified procedurally
- **Equivalence target**: (a) password-manager entry exists (operator confirms); (b) conduit Vercel env shows a rotated/updated `SUPABASE_SERVICE_ROLE_KEY` timestamp post-2026-07-15 and the app still authenticates; (c) #1128 closed
- **Cross red-team**: claude-code re-verifies each item against live state (`gh issue view` / Vercel env listing), never from memory, before ticking
- **Skills to load**: `supabase`, `deployment`, `security-audit`
- **Self-report on divergence**: yes — item (b) was expected to have a pre-existing issue ("likely does"); none was found despite multi-variant searches, flagged explicitly rather than silently assumed

---
Filed by the issue-filer agent from the 2026-07-14 onboarding-360 session. Sources: WS-A report §2/§9 (TENANT_MASTER_KEY), coordinator brief (conduit key rotation), #1128 (doc-category review).
