# /gto queries employers and apprentices with tenant_id=eq. (empty) and gets two 400s — the compliance counts are computed from failed requests

https://github.com/GaryOcean428/business-suite-unified/issues/1164

Snapshot updatedAt: 2026-09-06T09:13:51Z. Open at capture; re-read live.

**Observed on production** (`suite.crm7.app` serving `bb748fa`, read-only Playwright signed in as the seeded e2e identity, 2026-09-06 00:5xZ, cell `bsu /gto · light · 1440`): two PostgREST responses of **400** while the page loads:

```
400 GET …/rest/v1/employers?select=id%2Cstatus&tenant_id=eq.&is_host_employer=eq.true&limit=500
400 GET …/rest/v1/apprentices?select=id%2Cstatus%2Cend_date&tenant_id=eq.&limit=500
```

`tenant_id=eq.` with nothing after the operator: the page issued its queries before (or without) a resolved tenant id, and PostgREST rejects the empty filter. The page then renders its compliance table and scores as if it had data. Evidence: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-06/visual-gate-3102/matrix.json` (cell `load.netFails`), `shots/bsu_gto_light_1440.png`.

**Class.** A tenant-scoped read that fires with an unresolved tenant is the same shape as the NULL-as-unknown defects filed on 2026-09-04 (a sentinel that conflates "nothing" with "could not tell"). The fix is not to swallow the 400: gate the query on a resolved tenant (`enabled: !!tenantId`) and show the unresolved state honestly. Count the siblings by grepping for `.eq('tenant_id', ` call sites that can receive `''`/`undefined` and say how you enumerated them.

**Related operator note:** register row D-150 (business-suite-unified#1161) asks for click-through on this same table; fixing the data path first stops the click-through landing on rows built from nothing.

**Done means:** the failing case first (a test that renders /gto with an unresolved tenant and asserts no request is sent), zero ≥400 responses on the deployed `d.suite.crm7.app/gto` for the e2e tenant (network log on the PR), and the table showing either real rows or an honest empty state. Filed by the accountability lane from the 2026-09-06 production visual gate; PI names the owner.
