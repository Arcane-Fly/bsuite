# BSU branding: settings only save after clicking preview, Jodie AI logo missing, header logo not sourced from platform/tenant branding, and docs lack screenshots

https://github.com/GaryOcean428/business-suite-unified/issues/891

Snapshot updatedAt: 2026-08-31T02:52:38Z. Open at capture; re-read live.

Four findings, all branding/presentation defects in business-suite-unified.

## What's wrong

- **Branding changes only save after clicking "show preview" first** — an unnecessary, undiscoverable step. Operator: "Will only save after 'show preview'" (note.025)
- **Jodie AI logo image is missing** on `suite.crm7.app`; it should match crm7's. (note.026)
- **Header logo is fixed** rather than sourced from platform branding or the tenant's white-label setting. Operator: "Logo in header should be the logo set in the platform branding or the logo set in white label section per the relevant tenant." (note.105)
- **Platform documentation should include screenshots** — applies to all docs, not just this one. Operator: "Should include screen shots. Same for all docs." (note.020)

## Done means

- Branding saves directly, without requiring a preview click first.
- Jodie AI logo renders on suite.crm7.app, matching crm7.
- Header logo is dynamically sourced from platform branding / tenant white-label setting, not hardcoded.
- Platform docs include screenshots — apply as a general documentation standard going forward, not a one-off fix to the enterprise-admin doc.
