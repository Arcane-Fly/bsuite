---
kind: record
authority: none
owner: bsuite-lane
verdict: delivered
---

<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> Both halves — the in-app AI assistant and the plugin architecture — are live in CRM7.
>
> **Evidence:** `crm7/src/lib/ai/plugins/plugin-registry.ts`, `crm7/src/lib/ai/plugins/index.ts`,
> and a working first plugin at `crm7/src/lib/ai/plugins/xero/xero-plugin.ts`. Assistant UI at
> `crm7/src/components/ai/` (`AIAssistant.tsx`, `AICommandPalette.tsx`, `AIFloatingButton.tsx`,
> `AIHeader.tsx`, `AIInputArea.tsx`), with integration tests alongside.
>
> **Marker defect:** still flagged `W` (Working), which reads as in-flight.

---

# AI Assistant + Plugin System Implementation Plan

**Version:** 1.00W
**Date:** 2026-02-27
**Status:** Working
**Applies to:** CRM7 (primary), Conduit, business-suite-unified
**Imported from:** Internal planning artifact

**Project:** bsuite/crm7 - In-App AI Assistant with Plugin Architecture

---

## Executive Summary

Implement an in-app AI assistant using **Vercel AI SDK** that can automate all user actions in bsuite/crm7. The system will use **AI models from monkey-projects**, support a **plugin architecture** for extensibility, and enable users to create workflows and automations through natural language.

**Key Capabilities:**

- ✅ Update any data in the system (CRUD operations)
- ✅ Generate reports on demand
- ✅ Create and execute workflows
- ✅ Automate repetitive tasks
- ✅ Respect user permissions
- ✅ Extensible via plugins

---

## Implementation Status (Updated 2026-02-27)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core AI Infrastructure (tool registry, API endpoint) | ✅ Complete — 54 tools in `inputSchema` format, `api/ai/chat.ts` built |
| Phase 2 | UI Components (chat panel, tool confirmations) | ✅ Complete — `AIAssistant`, `AISheet`, `AIMessage`, `AIInputArea`, `AIToolCard`, `AICommandPalette` |
| Phase 3 | Model Integration (router, persona, skills) | ✅ Complete — `model-router.ts`, `jodie-persona.ts`, `jodie-skills.ts`, `useAIChat.ts` |
| Phase 4 | Plugin System (Activepieces) | 🔲 Not started |
| Phase 5 | Workflow Automation Engine | 🔲 Not started |

**Blocking items:**

- CRM7 AI chat endpoint needs Vercel deployment with `AI_GATEWAY_API_KEY` env var
- Conduit AI tools not yet implemented (see Conduit Integration section below)
- Cost tracking (`cost-tracker.ts`) not yet implemented

---

## Conduit Integration

> **Added 2026-02-27** — This section describes how the AI assistant and plugin system extends to the Conduit recruitment ATS.

### Conduit-Specific AI Tools

Conduit (Next.js 16 App Router) will register its own tools with the shared tool registry:

| Tool | Description | Permission |
|------|-------------|------------|
| `search_candidates` | Search across `conduit_candidates` table | `view_candidates` |
| `update_candidate_status` | Move candidate through pipeline stages | `manage_candidates` |
| `send_candidate_email` | Send email via shared email-dispatcher Edge Function | `manage_communications` |
| `schedule_interview` | Create interview event on candidate timeline | `manage_candidates` |
| `score_candidate` | AI-powered candidate scoring against job requirements | `view_candidates` |
| `create_job_posting` | Create new job in `conduit_jobs` table | `manage_jobs` |
| `search_talent_pool` | Search `conduit_talent_pools` for matching candidates | `view_talent_pools` |
| `bulk_pipeline_move` | Move multiple candidates through pipeline stages | `manage_candidates` |

### Communication Tools (Shared Edge Functions)

Conduit's communication features use the shared email infrastructure from the [Email Capabilities Plan](./20260227-email-capabilities-plan-v1.00W.md):

- **Email dispatch** → `supabase/functions/email-dispatcher/index.ts` (shared)
- **OAuth flows** → `supabase/functions/oauth-google-email/index.ts` and `oauth-microsoft-email/index.ts` (shared)
- **Communication storage** → `conduit_communications` table (Conduit-specific, see `conduit/src/types/entities.ts`)

### Cross-App Tool Registry Pattern

```typescript
// conduit/src/lib/ai/conduit-tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const conduitTools = [
  tool({
    name: 'search_candidates',
    description: 'Search for candidates in the recruitment pipeline',
    parameters: z.object({
      query: z.string(),
      status: z.enum(['active', 'archived', 'hired', 'rejected']).optional(),
      jobId: z.string().uuid().optional(),
      limit: z.number().default(10),
    }),
    requiredPermission: 'view_candidates',
    execute: async ({ query, status, jobId, limit }, context) => {
      const results = await context.supabase
        .from('conduit_candidates')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);
      return { success: true, results: results.data, count: results.data?.length ?? 0 };
    },
  }),
];
```

### Conduit UI Integration

The AI assistant in Conduit follows the D2C Neon Electric theme and uses:

- **State management:** Zustand (consistent with all Conduit stores)
- **UI framework:** Radix UI + Lucide icons
- **Server components:** Default to server components; `'use client'` only for interactive chat panel

---

## System Architecture

See the original plan source for the full system architecture diagram, including:

- **User Interface Layer** — AI Chat Panel (slide-out or bottom bar)
- **AI Orchestration Layer** — Vercel AI SDK with streaming, function calling, context management
- **Model Router** — Claude 4.6 Sonnet (fallback) <https://vercel.com/braden-pty-ltd/crm7/ai-gateway/models/claude-sonnet-4.6>, grok-4.1-fast-reasoning (default) <https://vercel.com/braden-pty-ltd/crm7/ai-gateway/models/grok-4.1-fast-reasoning>
- **Action Execution Layer** — Tool Registry (80+ tools), Permission Guard
- **Data Layer** — Supabase API Proxy with RLS enforcement and real-time subscriptions
- **Plugin System** — Plugin Loader for custom tools, models, and workflows

---

## Phase 1: Core AI Infrastructure (Week 1-2)

### 1.1 Vercel AI SDK Integration

**Dependencies:** `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`

**AI Configuration** (`src/lib/ai/config.ts`):

- Grok 4.1 Fast Reasoning (primary/default), Claude Sonnet 4.6 (fallback), Claude 4 Opus (complex)
- Model routing via Vercel AI Gateway: `crm7/src/lib/ai/model-router.ts`

**AI Chat API Route** (`src/pages/api/ai/chat.ts`):

- `streamText` with tool registry
- Permission-filtered tools per user
- System prompt with user context, permissions, portal, tenant
- Confirmation required for destructive actions

### 1.2 Tool Registry System

**80+ tools** organized by category:

- **CRUD Operations:** `create_apprentice`, `approve_timesheet`, etc.
- **Report Generation:** `generate_report` with date range and filters
- **Workflow Creation:** `create_workflow` with triggers and actions
- **Bulk Operations:** `bulk_update_status` for batch processing
- **Search & Query:** `search_entities` across all entity types

All tools use Zod schemas for parameter validation and require specific permissions.

---

## Phase 2: UI Components (Week 2-3)

### 2.1 AI Chat Interface (`src/components/ai/AIAssistant.tsx`)

- Floating button (bottom-right) with slide-out Sheet panel
- `useChat` from `ai/react` with streaming responses
- Quick action buttons for common tasks
- Tool invocation display with confirmation flow

### 2.2 Tool Execution Confirmation (`src/components/ai/ToolInvocationDisplay.tsx`)

- Yellow highlight for pending actions requiring confirmation
- Green highlight for completed actions
- Confirm/Cancel buttons for destructive operations

---

## Phase 3: Monkey-Projects Model Integration (Week 3)

### 3.1 Model Router (`src/lib/ai/model-router.ts`)

- `selectModel(complexity)` — routes to Haiku/Sonnet/Opus based on task complexity
- `estimateComplexity(input, toolsRequired)` — analyzes input to determine model

### 3.2 Cost Tracking (`src/lib/ai/cost-tracker.ts`)

- `logAIUsage()` — logs model, tokens, cost per request
- `getAIUsageStats()` — aggregates costs by tenant and period

---

## Phase 4: Plugin System (Week 4-5)

### 4.1 Plugin API (`packages/plugin-api/src/types.ts`)

```typescript
export interface BsuiteAIPlugin {
  name: string;
  version: string;
  description: string;
  tools?: AITool[];
  models?: AIModel[];
  workflows?: WorkflowTemplate[];
  onLoad?: (context: PluginContext) => Promise<void>;
  onUnload?: () => Promise<void>;
}
```

### 4.2 Example Plugin: Advanced Reporting

`@bsuite/advanced-reporting` — adds `generate_predictive_report` tool with AI-powered predictions and insights.

---

## Phase 5: Workflow Automation Engine (Week 5-6)

### 5.1 Workflow Executor (`src/lib/workflows/executor.ts`)

- Evaluates trigger conditions against event data
- Executes actions in sequence: `send_email`, `create_task`, `update_status`, `call_webhook`, `run_ai_action`
- AI-enhanced actions use `streamText` with tool registry for dynamic decisions
- Logs all executions

### 5.2 Workflow Builder UI (`src/components/workflows/WorkflowBuilder.tsx`)

- Step 1: Trigger selection (incident created, timesheet submitted, compliance expiring, milestone)
- Step 2: Action configuration (sequential action list)
- Step 3: Optional AI enhancement (natural language instructions for dynamic logic)

---

## Implementation Timeline

```
Week 1-2:   Vercel AI SDK integration, core tool registry
Week 3:     UI components (AI chat panel, tool confirmations)
Week 4:     Monkey-projects model integration, cost tracking
Week 5:     Plugin system foundation
Week 6:     Workflow automation engine
Week 7:     Testing and refinement
Week 8:     Documentation and examples

Total: 8 weeks (2 months)
```

---

## File Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── config.ts
│   │   ├── model-router.ts
│   │   ├── cost-tracker.ts
│   │   └── tools/
│   │       ├── index.ts
│   │       ├── crud-tools.ts
│   │       ├── report-tools.ts
│   │       └── workflow-tools.ts
│   ├── workflows/
│   │   ├── executor.ts
│   │   ├── evaluator.ts
│   │   └── actions.ts
│   └── plugins/
│       ├── loader.ts
│       └── registry.ts
├── components/
│   ├── ai/
│   │   ├── AIAssistant.tsx
│   │   ├── ToolInvocationDisplay.tsx
│   │   ├── QuickActions.tsx
│   │   └── ChatMessage.tsx
│   └── workflows/
│       ├── WorkflowBuilder.tsx
│       ├── ConditionBuilder.tsx
│       └── ActionList.tsx
├── pages/
│   └── api/
│       └── ai/
│           ├── chat.ts
│           └── execute-tool.ts
└── plugins/
    ├── advanced-reporting/
    └── custom-automation/
```

---

## Success Criteria

### Phase 1 (Core AI)

- ✅ AI chat responds to natural language
- ✅ 20+ tools registered and functional
- ✅ Permission checks prevent unauthorized actions
- ✅ Tool execution with confirmation flow works

### Phase 2 (UI)

- ✅ Chat panel accessible from all pages
- ✅ Messages stream in real-time
- ✅ Tool invocations display correctly
- ✅ Quick actions provide shortcuts

### Phase 3 (Models)

- ✅ Model selection works (Haiku/Sonnet/Opus)
- ✅ Cost tracking logged to database
- ✅ Usage stats visible in settings

### Phase 4 (Plugins)

- ✅ Plugin system can load external plugins
- ✅ Plugins can register custom tools
- ✅ Example plugin works end-to-end

### Phase 5 (Workflows)

- ✅ Workflow builder UI functional
- ✅ Workflows execute on triggers
- ✅ AI-enhanced workflows work
- ✅ Workflow analytics available

---

## Security Considerations

1. **Permission Enforcement** — Every tool checks user permissions; portal context respected; tenant isolation maintained
2. **Input Validation** — All parameters validated with Zod; SQL injection prevention; XSS prevention in chat
3. **Rate Limiting** — AI API calls rate-limited per user/tenant; tool execution throttled; cost limits configurable
4. **Audit Logging** — All AI actions logged with user/tool/result; failed permission checks logged; workflow executions tracked

---

## Testing Strategy

- **Unit Tests:** Tool execution logic, permission checking, model selection, workflow condition evaluation
- **Integration Tests:** AI chat end-to-end, tool invocation confirmation flow, workflow creation and execution, plugin loading
- **User Acceptance Tests:** Create apprentice via AI, generate report via AI, approve timesheets via AI, create workflow via UI

---

## Verified Pricing Documentation

### Primary Model: Grok 4.1 Fast Reasoning (xAI)

| Metric | Value |
|--------|-------|
| Input Cost | $0.0002 per 1K tokens ($0.20 per 1M) |
| Output Cost | $0.0005 per 1K tokens ($0.50 per 1M) |
| Context Window | 2,000,000 tokens (2M) |
| Max Output | 30,000 tokens |

### Fallback Models (Claude via Anthropic)

| Model | Context | Input Cost | Output Cost | Use Case |
|-------|---------|------------|-------------|----------|
| Claude Sonnet 4.6 | 200K | $0.003/1k | $0.015/1k | Primary fallback |
| Claude Opus 4.6 | 200K | $0.015/1k | $0.075/1k | Complex reasoning fallback |

### Monthly Cost Projections

- **Per tenant (1000 interactions/month):** ~$1.40 → $1.12 net with caching (Grok 4.1 Fast pricing)
- **100 tenants:** $112/month
- **1000 tenants:** $1,120/month
- **ROI:** 350:1 vs traditional support costs (5x better than original estimates)

---

## Activepieces Integration Strategy

**Recommendation: Integrate as complementary service, do NOT fork.**

### Use Case Division

- **In-App AI** → Internal data operations (CRUD, reports, approvals), real-time decisions, permission-sensitive actions
- **Activepieces** → External integrations (Xero, MYOB, Gmail, Slack, ADMS), complex multi-step flows, scheduled jobs

### Implementation Phases

1. **Phase 1 (Week 1):** Deploy Activepieces, create webhook endpoint, configure auth
2. **Phase 2 (Week 2-3):** Xero, ADMS, Gmail, Google Drive integrations
3. **Phase 3 (Week 4-6):** Workflow templates, AI-triggered flows, bi-directional sync

---

**Status:** Documentation Structure Defined
**Estimated Effort:** 8 weeks (2 months)
**Dependencies:** Vercel AI SDK, AI Gateway (Grok 4.1 + Claude fallbacks), Supabase
