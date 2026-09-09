# feat(braden): visual layout editor Phase 3b — publish workflow (BL-008 child)

https://github.com/GaryOcean428/braden/issues/266

Snapshot updatedAt: 2026-08-24T03:50:30Z. Open at capture; re-read live.

## Parent
Splits #206 (`BL-008`). Depends on Phases 2a, 2b, 3a.

## Scope (Phase 3b — publishing workflow)

1. `page_drafts` → `pages` promotion on publish (versioned)
2. Public site renders from `pages.layout` (jsonb), not the React tree
3. Roll-back UI: list past versions, click to revert
4. Schedule-publish: a `scheduled_publish_at` column + Supabase cron / edge function
5. Preview-as-anonymous mode (incognito-style render)

## Acceptance criteria
- Publish creates a new `pages` row with monotonically-increasing `version`
- Public site renders the latest published version
- Rollback restores a previous version as the latest
- Scheduled publish fires via Supabase cron

## Validation loop
§9.2 visual-equivalence: edit → save draft → preview → publish → reload public route → screenshot pair

## Cross red-team
claude-code verifies before flip-to-done

## Skills to load
`supabase`, `vercel-next-best-practices` (cron pattern), `bsuite-brand-system` (corporate)
