---
kind: record
authority: none
owner: bsuite
---

# Styling audit: h-screen/100vh \u2192 svh + kanban column width (MEDIUM)

https://github.com/GaryOcean428/braden/issues/358

Snapshot updatedAt: 2026-08-24T03:29:15Z. Open at capture; re-read live.

## Source
Platform-wide styling audit 2026-07-28. Wave 1 fixed 11× min-h-screen→min-h-svh + 46 border token replacements + 4 truncate fixes. Remaining:

## MEDIUM — viewport units
- components/admin/SiteEditorLoading.tsx:6 — h-screen → h-svh
- components/auth/AuthLoadingState.tsx:5 — min-h-[calc(100vh-200px)] → min-h-[calc(100svh-200px)]

## MEDIUM — kanban column width
- components/admin/kanban/KanbanColumn.tsx:19 — w-[280px] fixed width; 6 columns = 1760px minimum. Has overflow-x-auto (OK by design) but width is hardcoded. Consider w-[min(280px,80vw)] or responsive width.

## Note
braden has no dark mode — missing dark: variants are NOT findings. Corporate Braden brand colors are intentional.
