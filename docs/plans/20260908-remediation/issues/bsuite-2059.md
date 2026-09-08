# RULING 12.1 — email signatures and per-tenant email branding do not exist, and the 3,010-line archive email plan does not specify them

https://github.com/GaryOcean428/bsuite/issues/2059

Snapshot updatedAt: 2026-08-26T15:28:37Z. Open at capture; re-read live.

Operator **RULING 12.1** requires per-tenant email **branding** and email **signatures** on outbound mail. Neither exists anywhere in the estate, and — the part that matters — **the archive does not specify them either**, so this cannot be built by reading the recovery docs.

Found while verdicting `docs/recovered/` for **G5** (`bsuite#1830`). Full write-up: `docs/20260817-recovered-verdict-backlog-v1.00W.md` §4.

## The measurement, positive-controlled

Probed `crm7/src`, `business-suite-unified/src` and `conduit/src`:

- **Email signature / sign-off block: zero implementation.** Every `signature` hit in those trees is *document* signing (`chargeRateQuoteSigning.ts`, `signatureQueries.ts`, `hostAgreementSigning.test.ts`), not an email sign-off.
- **Per-tenant email branding on outbound mail: zero.** The only near-hit is an unrelated reserved-table-name test in BSU.
- **Positive control:** the same probe over the same trees returns **50 files** for `email_integrations`. The zero is real, not a broken pattern.
- `public.email_templates` exists (13 columns, tenant-scoped with admin RLS) and holds **0 rows**.

## Why "it's in the recovery docs" is wrong here

`docs/recovered/20260227-email-capabilities-plan-v1.00W.md` is **3,010 lines** — the largest document in that directory, and the obvious place to look. Its transport half genuinely shipped: `email-dispatcher` (v71), `oauth-google-email` (v93), `oauth-microsoft-email` (v94), `email-token-refresh` (v62), `email-inbox-sync` (v43), plus `email_integrations` / `email_messages` / `email_message_links` / `email_audit_log` / `email_templates`.

**But it contains no signature or branding requirement at all.** The document reads as the complete email plan, so an agent that finds it will reasonably conclude the requirement is covered and stop looking. It has been bannered to say so.

**This must be designed fresh.**

## Not covered by

- **The completion ledger's 87 items** — checked; this is absent from all of them.
- **crm7#1705** — a client connecting their own SMTP/Google/Azure account. Different surface: that is *how mail is sent*, this is *what it looks like when it arrives*.
- **crm7#1610** (Sent/SMS/Internal read pane), **crm7#480** (settings + inbox UI) — both inbound/UI, neither outbound presentation.
- **crm7#1607** — invoice email uses pure white and has no colour fallback. Adjacent and relevant (both concern outbound presentation), but scoped to one artefact's colour handling, not tenant branding or signatures.

Checked against all 71 open parent issues and 137 open crm7 issues.

## Scope (M)

1. **Design the requirement** — it does not exist in writing anywhere. Per-tenant: logo, colours, footer, reply-to identity; per-user: signature block. Both must respect the D2C brand rules (pure white and pure black are banned in every role, error is red not purple).
2. Decide storage: extend `email_templates`, or a sibling `email_branding` / signature table. **Do not create a second source of truth for tenant branding** — branding already exists for the apps; outbound mail should consume it, not restate it.
3. Apply at send time in `email-dispatcher`, so every outbound path inherits it rather than each caller re-implementing.
4. Seed `email_templates` — currently 0 rows.

## Acceptance

- A tenant admin sets branding and a signature once, and both appear on mail sent from every app
- No hardcoded tenant identity in `email-dispatcher`
- Pure white/black absent from rendered mail, including any colour passed through a converter (the defect class in bsuite#1962)

