# Operator Screenshots

This directory holds the supporting screenshots referenced from
[`docs/20260425-operator-handoff-v1.00W.md`](../archive/README.md) *(archived — was `20260425-operator-handoff-v1.00W.md`)*.
Each screenshot documents a one-shot manual configuration step a human
operator (Braden / Garrett) must perform in a hosted dashboard
(Supabase, Azure, etc.). They exist to short-circuit the next operator's
"where exactly is that toggle" hunt — they are not intended to be
reviewed in PRs and should never contain secrets.

## Capture protocol

1. Operator performs the step in the source dashboard while sharing
   their screen, OR captures the screenshot themselves immediately
   after the step succeeds.
2. Frame the screenshot tightly on the relevant control + the
   surrounding context. Default to a 1280×720 or 1440×900 viewport.
3. **Redact every secret before saving** — hostnames in the navbar,
   tenant IDs in URLs, project IDs, JWT secrets, OAuth client secrets,
   environment-variable values, email addresses other than
   `braden.lang77@gmail.com`. Use a solid block (not blur).
4. Save as PNG with the exact filename listed below. PNG (not JPG)
   keeps the dashboard text crisp.
5. Commit on a `docs/operator-screenshots-<topic>` branch and open a
   PR. Reviewer focus is "secrets fully redacted, filename matches
   handoff doc reference, image renders".

## Required captures

These filenames are referenced verbatim from
`docs/20260425-operator-handoff-v1.00W.md`. Add the screenshot to this
folder as PNG once the corresponding operator step has been completed.

| Filename | Source step in the handoff doc |
|----------|-------------------------------|
| `oauth-state-secret-add.png` | §1 — adding the OAuth state-encryption secret to Supabase Vault |
| `custom-postgres-config.png` | §2 — applying the custom Postgres config in the Supabase dashboard |
| `azure-xms-edov-optional-claim.png` | §3 — Azure AD app registration optional claims (`xms_edov`) |
| `auth-url-config-redirect-urls.png` | §4 — Supabase Auth URL Configuration (redirect URLs) |
| `jwt-revoke-hs256.png` | §5 — revoking the legacy HS256 JWT signing key |

## When something is missing

If the next operator opens this directory and a referenced PNG is
absent, the corresponding section of the handoff doc has not been
performed yet (or the screenshot was lost). Treat it as a TODO — do
the step, capture the screenshot, raise a one-file PR.
