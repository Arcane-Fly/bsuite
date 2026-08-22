# `docs/references/` — source-material index

**Created 2026-08-17.** This folder had no index, so its contents were invisible to anyone who did
not already know a filename. Ten files sat here unlisted, including two that are load-bearing for
rate calculation.

## What belongs here

**Reference material we did not write** — vendor API documentation, regulator guidance, competitor
knowledgebase crawls, and captured domain source material — plus the small number of our own
documents whose job is to *map* that material onto BSuite.

This is **not** a plans folder and not a decisions folder. Nothing here is a commitment to build
anything. Plans live in `docs/plans/`; rulings live in the register named by `docs/README.md`.

## Contents

### Rate calculation — domain source material

| File | What it is | Why it matters |
|---|---|---|
| `20260730-elements-of-rate-calculation-v1.00W.md` | Captured rates-calculator source material (80K) | The element-by-element construction of a charge rate. Load-bearing for `@bsuite/charge-calc`. |
| `20260730-rdo-flexibility-v1.00W.md` | RDO (Rostered Day Off) flexibility source material (24K) | RDO accrual/banking treatment feeding the ordinary-wage construction. |
| `20260730-gto-enquiry-to-billing-process-flow-v1.00D.md` | GTO enquiry→billing process flow, Draft (52K) | Our own mapping doc — the end-to-end commercial path. |
| `20260730-gto-process-flow-v1.0.svg` | Rendered diagram of the above | The picture for the flow doc; keep the two in sync. |

> **Caution.** These describe how rates are *constructed*. They are reference input, not the
> engine's specification, and they are not date-effective. Award figures move; a number read out of
> this folder and hardcoded is the estate's most-repeated defect class. Model the **function**,
> then verify against the published pay guide / MAPD API.

### Xero

| File | What it is |
|---|---|
| `20260729-xero-api-docs-v1.00W.md` | Captured Xero API documentation (16K) |
| `20260729-xero-field-map-v1.00D.md` | Draft field map — what rate data can come **from** Xero vs what we hardcode (40K) |

### Regulator guidance

| File | What it is |
|---|---|
| `Evidence Guide for GTOs to Support the National Standards.md` | Regulator evidence guide for Group Training Organisations against the National Standards (60K) |

### Competitor knowledgebase — Code House / Workforce One

| File | What it is |
|---|---|
| `codehouse-knowledgebase-crawl.md` | Document-library crawl (12K) |
| `codehouse_kb_crawl_results.md` | Crawl results (8K) |
| `codehouse_articles.json` | Machine-readable article list — title + URL (4K) |

> These are a **competitor's** published help centre, captured for parity analysis. They describe
> Workforce One's behaviour, never a BSuite requirement. The parity specs that cite them are in
> `docs/` under the `*-parity-spec-*` names.

## Adding a file here

Follow the estate naming convention — `YYYYMMDD-descriptive-name-vMAJOR.MINOR[STATUS].md`, where
STATUS is `W`orking / `D`raft / `R`eview / `A`pproved / `F`rozen — **and add a row above in the same
commit**. Three of the files listed here predate the convention and keep their original names
because renaming captured source material breaks the citations that point at it; do not rename them
retroactively, and do not treat them as licence to skip the convention on anything new.
