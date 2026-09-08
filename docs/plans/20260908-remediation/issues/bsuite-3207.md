# [P1][customization] Visually bind widgets, selectors and workflow steps to the current person, host or contract—including related collections

https://github.com/GaryOcean428/bsuite/issues/3207

Snapshot updatedAt: 2026-09-08T05:23:36Z. Open at capture; re-read live.

## Trigger
From a person's/placement page, Braden adds a placements card through Add card or the header plus. It is unusable as that person's placement history, with no clear way to choose the relationship. Training-contract sections reportedly mix other records; the custom entity selector is confusing. Tenant scope alone is insufficient: two different apprentices in one tenant must not be mixed.

## Source evidence, 8 September
- `crm7/src/lib/page-builder/EntityTableWidget.tsx:27` config exposes entityType and tenantId. `useEntityRows` queries the whole canonical table, optional tenant filter, newest 50 rows; no current-record relationship filter in that generic path.
- Related widgets DO exist: `crm7/src/components/platform/pageGridLayoutAdapter.tsx:294,333` calls buildRelatedEntityWidgetConfig; `crm7/src/lib/authoring/fk-relationships.ts:229` binds current sourceTable/recordId to a decoded FK. Do not claim the entire binding system is absent.
- `crm7/src/lib/page-builder/RelatedEntityCardWidget.tsx:152–192` resolves one source FK and one target row. This is not the same as an inverse one-to-many placement-history grid.
- The training-contract report is a user-observed record-context defect, not yet proof of cross-tenant disclosure. Investigate the selector, card, query, cache key and server policy separately.

## Required visual experience
An inspector can choose “Placements belonging to this person”, “Contracts for this apprentice” or “Contacts at this host”, show the relationship and scope in plain words, choose filters/columns and preview results. Support direct FK, reverse collections and approved junction relations. Reuse canonical relation metadata; do not ask the user to type SQL, UUIDs, table names or join expressions. Carry this typed context into workflow inputs, form defaults, assignments and outputs. Add-related-record opens inline and returns the new record selected.

## Acceptance
- [ ] Enumerate widget factories, relationship selectors, route-context providers and workflow binding editors across all six apps; generic and related variants are separate positive controls.
- [ ] Add a placement-history grid on person A, save/reload, navigate to person B: only the appropriate rows appear, including records beyond the first 50 via pagination/search. Repeat host and contract paths.
- [ ] No stale record context after navigation, tenant/acting-as switch, cached load or two open tabs. Missing context displays a recoverable state and does not fall back to an unfiltered tenant-wide collection.
- [ ] Inverse and many-to-many relations can be configured visually, labeled, previewed and saved; invalid/deleted relationships explain the problem without corrupting layout.
- [ ] Same-tenant unrelated records and other-tenant records are negative cases; backend checks reject tampered IDs. Host/caseload scope and developer acting-as context are enforced.
- [ ] Workflow nodes receive typed record references and resolve fresh authorized data at execution; stale serialized row snapshots cannot grant access.
- [ ] Add/create/view/edit remain in context; failed saves keep filters, field mappings and draft content. Two simultaneously open detail pages cannot overwrite one another's binding.
- [ ] Deployed tests prove user-configured widgets AND workflow nodes use the binding. Reverting the record predicate must fail the test.

Owner role: shared record-binding maintainer. Parent https://github.com/GaryOcean428/bsuite/issues/3204; dependencies/related: https://github.com/GaryOcean428/bsuite/issues/3206, crm7#2489, GaryOcean428/crm7#2472/GaryOcean428/crm7#2475/GaryOcean428/crm7#2478 (related lists), GaryOcean428/crm7#2493 (null-tenant reads), GaryOcean428/crm7#2573 (legacy apprentice FK class). Do not duplicate those fixes or label this closed after repairing one page.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.

