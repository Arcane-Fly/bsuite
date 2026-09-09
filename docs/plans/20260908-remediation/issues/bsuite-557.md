# feat(jodie): register Jodie as GitHub App with webhook receiver

https://github.com/GaryOcean428/bsuite/issues/557

Snapshot updatedAt: 2026-08-24T03:26:03Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q3 research synthesis**
> Source: `/home/user/workspace/research/q3-jodie-copilot-architecture.md` (architecture for end-to-end issue triage).

## Mandatory before merge

Skills:
- `github-app` workflows (this issue is the canonical reference)
- `supabase` (storing app installation tokens with RLS)
- `forms-and-validation`
- `verification-before-completion`

## Red-team requirements

1. **Security agent** — private key stored in Vercel Encrypted Env Var only; never in repo, never in client bundle. Webhook signature verification required.
2. **Reliability agent** — webhook handler is idempotent (use delivery GUID).
3. **Performance agent** — webhook ack <500 ms (queue heavy work).
4. **Quality agent** — every webhook event has a typed handler.

## Problem

Jodie AI is a stub assignee today (see [#542](https://github.com/GaryOcean428/bsuite/issues/542)). To act as a first-class triage agent, Jodie needs to be a registered GitHub App with webhooks, not a person account.

## Required implementation

Register a GitHub App `bsuite-jodie` with these permissions per [GitHub Docs — Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app):

- `issues: write` (read+write)
- `pull_requests: write`
- `contents: write`
- `actions: read`
- `metadata: read` (default)

Webhook subscriptions per [GitHub Docs — Webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads):
- `issues.opened`
- `issues.assigned`
- `issue_comment.created`
- `pull_request.opened`
- `pull_request.review_requested`

Webhook receiver: Vercel Edge Function at `/api/jodie/webhook`. Verifies `X-Hub-Signature-256`, deduplicates on `X-GitHub-Delivery`, enqueues to Supabase `jodie_webhook_queue` for asynchronous processing by the Jodie agent loop.

Installation token exchange via `octokit/auth-app` using the App's private key (PEM in Vercel encrypted env var). Tokens cached with 1-hour TTL in Supabase `jodie_app_installations`.

## Acceptance criteria

- [ ] App created at github.com/organizations/GaryOcean428/settings/apps
- [ ] App installed on all 7 repos (bsuite, crm7, conduit, business-suite-unified, R80.3, braden, throughput)
- [ ] Webhook receiver verifies signature, returns 401 on mismatch
- [ ] Idempotent on duplicate delivery
- [ ] Installation tokens cached + refreshed correctly
- [ ] All test events from "Recent deliveries" tab return 200
- [ ] Private key never appears in any committed file (CI grep check)
- [ ] Conventional commits

## Suggested team

Heavy scope (security-critical, requires repo admin). `bsuite_heavy_work_queue`. Label `needs-team`. Coordinator should be a human with org-admin rights.

## Citations

- [GitHub Docs — Choosing permissions for a GitHub App (2026)](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)
- [GitHub Docs — Webhook events and payloads (2026)](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitHub Docs — Authenticating as a GitHub App (2026)](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app)
- [Octokit auth-app (2026)](https://github.com/octokit/auth-app.js)
- Internal: `/home/user/workspace/research/q3-jodie-copilot-architecture.md` § 1

