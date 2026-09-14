# Enable code scanning (CodeQL) — currently off on all three repos

https://github.com/GaryOcean428/bsuite/issues/1897

Snapshot updatedAt: 2026-08-24T03:26:15Z. Open at capture; re-read live.

Measured 2026-08-11: `GET /code-scanning/alerts` returns **403 — code scanning is not enabled** on `bsuite`, `crm7` and `business-suite-unified`.

CodeQL is free on these repos. The defect class it catches — injection, unsafe deserialisation, path traversal — is currently caught by **nothing** in this estate.

One settings change per repo: Settings → Code security → Code scanning → Set up → Default.

Context: `docs/00-roadmap/20260811-security-signal-analysis-1.00W.md` (bsuite#1896).
