---
kind: record
authority: none
owner: bsuite
---

# Implement verified SEEK postPosition + Indeed Job Sync publish() once partner access is granted

https://github.com/GaryOcean428/conduit/issues/425

Snapshot updatedAt: 2026-08-24T03:26:41Z. Open at capture; re-read live.

## Context

`src/lib/jobBoards/providers/seek.ts` and `providers/indeedJobSync.ts` correctly refuse to call either API today — conduit holds no SEEK or Indeed Job Sync partner credentials, and even with credentials present, `publish()` deliberately stays unimplemented rather than guess at an unverified schema. See the WAVE 5 lane PR (2026-08-10) for the honest-gating pattern and the `SEEK_INTEGRATION_ENABLED` / `INDEED_JOB_SYNC_INTEGRATION_ENABLED` second gate added there.

This issue tracks the follow-up: once SEEK and/or Indeed grant partner approval and issue real credentials + a test hirer, implement and verify the actual publish call.

## Verified against live docs (2026-08-10) — starting point for whoever picks this up

### SEEK
- Auth: OAuth 2.0 client-credentials, `POST https://auth.seek.com/oauth/token` with `{ audience, client_id, client_secret, grant_type: 'client_credentials' }`. `audience` is `https://graphql.seek.com` (prod) or `https://test.graphql.seek.com` (test hirer). Returns a Bearer token valid 1800s, no refresh token — cache and re-request.
  https://developer.seek.com/auth/partner-tokens
- Posting mutation: `postPosition` (creates opening + posts a PositionProfile in one call). Also `postPositionProfileForOpening` for an additional profile on an existing opening. Fields referenced in docs prose (NOT yet verified against a live schema — do this before writing the client): `positionTitle`, `positionOrganizations`, `positionFormattedDescriptions`, `offeredRemunerationPackage`, `seekAnzWorkTypeCode`, `jobCategories`, `positionLocation`, `seekAdvertisementProductId`, `idempotencyId` (UUID).
  https://developer.seek.com/use-cases/job-posting/managing-job-ads/posting-a-job-ad
- Even the "test hirer" environment requires an approved `JobPosting` hirer relationship — there is no way to build/verify this mutation without holding partner credentials first. Do not implement against the field list above without introspecting the real schema once credentials exist (`https://graphql.seek.com/graphql` supports introspection with a valid token).

### Indeed Job Sync
- GraphQL, 2-legged OAuth 2.0 client-credentials. Onboarding requires becoming an approved ATS partner + submitting the integration for review before production traffic.
  https://docs.indeed.com/job-sync-api/job-sync-api-guide

## Acceptance criteria
- [ ] Real `postPosition` (SEEK) and equivalent Indeed Job Sync mutation implemented, mapped from `JobPostingPayload`.
- [ ] Manually verified against SEEK's test hirer / Indeed's sandbox before `SEEK_INTEGRATION_ENABLED=true` / `INDEED_JOB_SYNC_INTEGRATION_ENABLED=true` is ever set anywhere.
- [ ] `capability().available` only becomes `true` once verification above is complete — no partial/guessed rollout.
- [ ] Tests updated in `src/lib/jobBoards/__tests__/providers.test.ts`.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence (compare a real posted ad in SEEK's/Indeed's UI against the payload sent)
- **Equivalence target**: a real, human-confirmed job ad live on SEEK's/Indeed's test hirer, matching `JobPostingPayload`
- **Cross red-team**: claude-code verifies before flip-to-done
- **Skills to load**: `research-best-practice`, `test-qa-and-verification`
- **Self-report on divergence**: yes (mandatory)

## Blocker
Requires Braden/operator to complete SEEK's Integration Request form and Indeed's ATS partner onboarding. Not actionable until partner credentials + a test hirer/sandbox exist.
