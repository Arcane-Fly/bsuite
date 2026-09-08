# [P2][schema-builder] Needs a rebuild, and probably belongs in the Developer Portal not Settings

https://github.com/GaryOcean428/business-suite-unified/issues/675

Snapshot updatedAt: 2026-08-24T03:28:58Z. Open at capture; re-read live.

Operator, 2026-08-10: *"this needs 100x improvement. and should this be in developer portal?"*

`/settings/schema-builder` opens on an all-but-empty canvas with a quick-start tooltip and nothing else. It is marked BETA.

**Two questions, one of which is placement.** It sits under **Settings** in the nav while the Developer Portal has its own Database console (Tables / Schema Visualizer / Functions / Triggers / Enums / Roles). A visual entity designer is the same job as the Schema Visualizer tab and is developer-tier work — having them in two different places splits one surface.

**Recommendation:** fold Schema Builder into Developer Portal → Database as a tab beside Schema Visualizer, and drop the Settings entry. Then the rebuild is one surface, not two half-surfaces.

Scope of the rebuild to be specced separately — this issue is to settle placement first, because rebuilding it where it stands would entrench the split.
