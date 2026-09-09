# chore(advisors): unallowlisted performance findings (auto-filed by sweep)

https://github.com/GaryOcean428/bsuite/issues/1542

Snapshot updatedAt: 2026-08-24T03:28:10Z. Open at capture; re-read live.

## Supabase performance advisor findings (auto-filed by supabase-advisor-sweep)

Run: https://github.com/GaryOcean428/bsuite/actions/runs/27751856526

### `multiple_permissive_policies` — `document_metadata`

**Level:** WARN
**Detail:** Table \`public.document_metadata\` has multiple permissive policies for role \`authenticated\` for action \`INSERT\`. Policies include \`{document_metadata_insert,document_metadata_self_insert}\`
**Remediation:** https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

```json
{
  "name": "multiple_permissive_policies",
  "title": "Multiple Permissive Policies",
  "level": "WARN",
  "facing": "EXTERNAL",
  "categories": [
    "PERFORMANCE"
  ],
  "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
  "detail": "Table \\`public.document_metadata\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{document_metadata_insert,document_metadata_self_insert}\\`",
  "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
  "metadata": {
    "name": "document_metadata",
    "type": "table",
    "schema": "public"
  },
  "cache_key": "multiple_permissive_policies_public_document_metadata_authenticated_INSERT"
}
```

_Fix forward via a floor-gated migration with pgTAP coverage (§12.1), then re-run the sweep. If accepted-by-design, add an allowlist rule with a reason._
