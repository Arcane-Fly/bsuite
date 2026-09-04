---
kind: plan
authority: operator
owner: bsuite
evidence:
  - .github/workflows/app-quality-checks.yml
  - scripts/check-exported-not-mounted.mjs
  - crm7/src/components/communications/EmailBody.tsx
  - crm7/src/components/settings/JodieOverageSettings.tsx
  - crm7/src/lib/ai/evaluateJodieTurn.ts
  - crm7/supabase/migrations/20261118000000_ai_quotas_and_query_usage.sql
---

# Jodie automation + email notices — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Ship the operator-approved design: full-height email reading pane, Raise notice into `/notifications`, per-tenant Jodie automation dial, query overages at 15% markup.

**Architecture:** Pure decision functions (levels, markup, quota) live in `crm7/src/lib/ai/` with no runtime imports so `api/ai/chat.ts` can use them. Ledger is sibling tables to SMS (`ai_quotas` / `ai_query_usage`) in the shared Supabase project. Notices write `public.notifications`.

**Tech Stack:** React 19, Vite crm7, Vitest, Supabase RLS, existing `hasAiAccess` / `resolveAiEntitlement`.

**Design:** `docs/plans/20260903-jodie-automation-notifications-design-v1.00W.md`

**Skills:** `bsuite-supabase-migrations`, `bsuite-react-testing`, `bsuite-brand-system`, `auth-supabase`, `test-driven-development`

---

### Task 1: Reading pane fills the window

**Files:** `crm7/src/components/communications/EmailBody.tsx`, `EmailBody.test.tsx`, `mail/ReadingPane.tsx`

Done in this session: iframe height = max(document, pane, minHeight); sandbox unchanged.

**Verify:** `pnpm exec vitest run src/components/communications/EmailBody.test.tsx src/components/communications/EntityCorrespondence.test.tsx`

---

### Task 2: Raise notice from the reading pane

**Files:**
- Create: `crm7/src/components/communications/mail/raiseEmailNotice.ts`
- Create: `crm7/src/components/communications/mail/raiseEmailNotice.test.ts`
- Modify: `ReadingPane.tsx`, `MailClient.tsx`

Insert into `notifications` (`entity_type=email_message`, `action_url=/communications?message=<id>`). Toast on success. No AI required.

---

### Task 3: Deep link `/communications?message=`

**Files:** `crm7/src/pages/communications/index.tsx`, `index.test.tsx`, `MailClient.tsx`

Open that id in the reading pane. Clear the query after open so reload does not re-raise compose-style loops.

---

### Task 4: Automation level + markup + quota (pure)

**Files:**
- Create: `crm7/src/lib/ai/automation-level.ts` + `.test.ts`
- Create: `crm7/src/lib/ai/query-quota.ts` + `.test.ts`

`JODIE_MARKUP_BPS = 1500`. `checkQueryQuota` mirrors SMS `checkQuota` (included then overage, cap 0 = off, cap null = unlimited). Client cannot supply markup.

---

### Task 5: `ai_quotas` + `ai_query_usage` migration

**Files:** `business-suite-unified/supabase/migrations/20261118000000_ai_quotas_and_query_usage.sql`

Copy RLS shape from `20261001000000_messaging_platform.sql`: tenant read via `auth_tenant_id()`, writes of quota by owner/admin, usage insert via authenticated (chat path) or service role. `markup_bps` default 1500, no client UPDATE on that column (trigger or revoke).

Do not apply live unless asked.

---

### Task 6: Chat path honours quota + level

**Files:** `crm7/api/ai/chat.ts`, `crm7/src/lib/ai/tools/email-tools.ts`

After `resolveAiEntitlement`, `checkQueryQuota`. 402 + `NO_QUOTA` / `OVERAGE_CAP`. After a successful turn, insert `ai_query_usage`. Filter tools by `clampLevel`. `send_email` already says confirm-before-send; refuse outright below `auto_act`.

---

### Task 7: Tenant settings — dial + enable overages

**Files:** `crm7/src/pages/settings/configuration.tsx` (notifications tab), compact inline panel reused on 402 (D8).

Enable overages sets cap from 0 → 5000 cents default. Automation select clamped to licence ceiling.

---

### Task 8: Notifications manager click already navigates `action_url`

Confirm `onRowClick` marks read and follows `action_url`. Add a type filter later if needed; not blocking.

---

Commit scopes: `fix(crm7): …` for pane/notice; `feat(crm7): …` for dial/quota; `feat(bsu): …` for migration. GPG-signed. PRs target `development`.
