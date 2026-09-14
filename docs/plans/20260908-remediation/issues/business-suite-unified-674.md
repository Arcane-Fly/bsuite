# [P1][developer-console] Extensions, Publications and Settings are read-only — a developer must be able to edit them

https://github.com/GaryOcean428/business-suite-unified/issues/674

Snapshot updatedAt: 2026-08-24T03:28:56Z. Open at capture; re-read live.

Operator, 2026-08-10: *"Extensions, Publications and Settings are read-only — no write path exists for them. as a developer it must be editable."*

The console states this as a limitation in its own banner. For a Developer Portal whose stated purpose is "better UX and tighter control than raw Supabase", read-only means the developer still has to leave for the Supabase dashboard — which defeats the surface.

**Design constraint already ruled (2026-08-06 plan, D2):** the console must NOT apply DDL directly. One shared production Postgres, six apps, no undo on `DROP COLUMN`. The existing `ProposeMigrationDialog` is the right shape — an edit generates a migration file and opens a draft PR.

**Required:** extend that same propose-a-migration path to extensions, publications and settings, rather than adding a direct-write path.

**Acceptance:** editing any of the three produces a reviewable migration PR and applies nothing directly.
