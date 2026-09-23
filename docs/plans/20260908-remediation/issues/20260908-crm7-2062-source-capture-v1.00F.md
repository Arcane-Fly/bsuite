---
kind: record
authority: none
owner: bsuite
---

# JSON-only / API-only workflows have no non-coding UI path for import, export, or data interaction

https://github.com/GaryOcean428/crm7/issues/2062

Snapshot updatedAt: 2026-09-06T09:16:26Z. Open at capture; re-read live.

Two findings, one long-standing directive: **anything reachable via raw JSON should also be reachable through a non-coding UI path.**

## What's wrong

- **Long-standing directive, repeated again this pass.** Operator, repeat_offence=true: "Advanced json ok, but anything available via json should be done through non-coding means. This is always and has been a long standing directive." (note.120, at `/admin/data`)
- **Concrete instance of the same gap**: developers need to actually interact with the data here — import/export CSV/XLSX, and downloadable/re-uploadable import templates. Operator: "Must be able to import and export csv and xlxs and create import templates to download and use to re-upload." (note.124, same route)

## Done means

- Every capability currently reachable only via raw JSON on `/admin/data` (and by extension, any similar surface) has a non-coding UI equivalent — an advanced JSON mode may remain available alongside it for developers, but is never the only path.
- CSV/XLSX import and export work from the UI, including a downloadable import template that can be filled in and re-uploaded without hand-editing JSON.
