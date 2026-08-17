# Contributing to bsuite CRM7 AI Assistant

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** Final
**Author:** Development Team

---

Thank you for contributing to the bsuite CRM7 AI Assistant! This document outlines development practices and guidelines for the AI system implementation.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [AI Model Standards](#ai-model-standards)
- [Tool Development](#tool-development)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Documentation Standards](#documentation-standards)

## Development Setup

### Prerequisites

- **Node.js**: ≥20.0.0 (Node 22 LTS recommended)
- **pnpm**: Latest stable version (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Git**: Latest stable version
- **Vercel CLI**: For Edge Function testing (`npm i -g vercel`)

### Setup Instructions

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add:
# - AI_GATEWAY_API_KEY (from Vercel AI Gateway)
# - SUPABASE_URL and SUPABASE_ANON_KEY

# 3. Run development server
pnpm run dev

# 4. Test AI endpoint (in separate terminal)
curl http://localhost:5173/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "userId": "test-user",
    "tenantId": "test-tenant"
  }'
```

For detailed setup, see Setup Guide *(planned)*.

## Project Structure

The AI system follows a clean architecture with clear separation of concerns:

```
crm7/
├── api/
│   └── ai/
│       └── chat.ts              # Edge Function - AI chat endpoint
│
├── src/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── config.ts        # AI models configuration
│   │   │   ├── model-router.ts  # Model selection logic
│   │   │   ├── cost-tracker.ts  # Usage tracking
│   │   │   └── tools/
│   │   │       ├── index.ts     # Tool registry
│   │   │       ├── crud-tools.ts      # CRUD operations
│   │   │       ├── report-tools.ts    # Report generation
│   │   │       └── workflow-tools.ts  # Workflow creation
│   │   │
│   │   └── workflows/
│   │       ├── executor.ts      # Workflow execution engine
│   │       ├── evaluator.ts     # Condition evaluation
│   │       └── actions.ts       # Action executors
│   │
│   └── components/
│       ├── ai/
│       │   ├── AIAssistant.tsx          # Main chat interface
│       │   ├── ToolInvocationDisplay.tsx # Tool confirmation UI
│       │   ├── QuickActions.tsx
│       │   └── ChatMessage.tsx
│       │
│       └── workflows/
│           ├── WorkflowBuilder.tsx      # Workflow creation UI
│           ├── ConditionBuilder.tsx
│           └── ActionList.tsx
│
└── docs/
    └── ai/                      # AI system documentation
        ├── CONTRIBUTING.md      # This file
        ├── README.md
        ├── ROADMAP.md
        ├── architecture/
        ├── pricing/
        ├── features/
        ├── development/
        ├── integrations/
        ├── diagrams/
        └── reference/
```

### Where to Add New Code

**Adding a new AI tool?**
→ `src/lib/ai/tools/` (TypeScript)

**Adding a new workflow action?**
→ `src/lib/workflows/actions.ts` (TypeScript)

**Adding a new UI component?**
→ `src/components/ai/` or `src/components/workflows/`

**Adding API endpoint?**
→ `api/` directory (Vercel Edge Functions)

**Adding documentation?**
→ `docs/ai/` with proper versioning (see Documentation Standards)

### Development Principles

1. **Permission First**: Every tool MUST check user permissions before execution
2. **Tenant Isolation**: All database queries MUST include tenant_id filtering
3. **Edge Runtime**: AI endpoints should use Edge Runtime for optimal streaming
4. **Type Safety**: Full type coverage in TypeScript
5. **Immutable Constants**: Frozen facts from reference docs are NEVER modified
6. **Cost Awareness**: Log all AI usage for cost tracking
7. **User Confirmation**: Destructive actions MUST prompt for confirmation

## Code Style

### TypeScript Style

- Use **strict mode** with full type coverage
- Follow ESLint configuration
- Prefer `const` over `let`
- Use async/await over callbacks
- Document complex types and functions

```typescript
/**
 * AI Tool definition for creating apprentice records
 */
interface CreateApprenticeTool {
  name: 'create_apprentice';
  description: string;
  parameters: z.ZodSchema;
  requiredPermission: Permission;
  execute: (params: CreateApprenticeParams, context: ExecutionContext) => Promise<ToolResult>;
}

/**
 * Execute tool with permission checking and error handling
 */
async function executeTool(
  tool: AITool,
  params: unknown,
  context: ExecutionContext
): Promise<ToolResult> {
  // Check permissions first
  if (!context.permissions.can(tool.requiredPermission)) {
    throw new PermissionError(`User lacks ${tool.requiredPermission} permission`);
  }

  // Execute with error handling
  try {
    return await tool.execute(params, context);
  } catch (error) {
    console.error(`[Tool Error] ${tool.name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### React Component Style

- Use functional components with hooks
- Prefer `useChat` from `ai/react` for AI interactions
- Keep components focused and single-purpose
- Use Shadcn UI components for consistency

```typescript
/**
 * AI Chat Assistant component with streaming support
 */
export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/ai/chat',
    body: {
      userId: user.id,
      tenantId: user.tenantId,
    },
    onError: (error) => {
      toast.error(`AI Error: ${error.message}`);
    },
  });

  // Component implementation...
}
```

### Formatting

We use Prettier for TypeScript:

```bash
# Format code
pnpm run format

# Check formatting
pnpm run format:check
```

## AI Model Standards

### Primary Model: Grok 4.3

**Never write a model identifier into a caller.** Ask `selectModel()` for a tier and let the
router resolve it. The roster is operator-approved and re-verified live against the gateway
`/v1/models`; the single source of truth is `crm7/src/lib/ai/config.ts`, and this section is a
pointer to it, not a second copy.

```typescript
// ✅ Good: ask for a tier, let the router resolve the model
import { selectModel } from '@/lib/ai/model-router';

const model = selectModel('medium'); // resolves to the current primary

// ❌ Bad: hardcoding any model identifier
const model = 'anthropic/claude-opus-5'; // Don't do this — even when the id is current
```

Hardcoding is the defect, independent of which identifier is used. A pinned string survives a
roster change silently, which is how retired identifiers outlive their models. `scripts/drift-scan.mjs`
hard-fails on retired identifiers (signal `STALE-GROK`) in **any** non-archived file, including
Markdown — so a document that pins a model becomes a CI failure the moment the roster moves.

### Model Selection Rules

Tiers, not models. Resolved values below were read from `crm7/src/lib/ai/config.ts` at
`development` HEAD (roster change 2026-07-31); re-read that file rather than trusting this table.

| Task Complexity | Primary tier resolves to | Fallback | Reasoning |
|----------------|--------------------------|----------|-----------|
| **Simple** | Grok 4.1 Fast Non-Reasoning | GLM 5.2 | ~6× cheaper on input; sized for high-volume lookup/CRUD traffic |
| **Medium** | Grok 4.3 (1M context) | GLM 5.2 | Everything capability-sensitive routes here |
| **Complex** | Grok 4.3 (1M context) | Claude Opus 5 | 4.3 is one unified model, so `medium` and `complex` resolve alike; hardest multi-step work escalates to the fallback |

> **Context window:** 1M, not 2M. The superseded pair carried 2M. Nothing batches near 2M today,
> but a caller relying on >1M input is the constraint that changed.

### Cost Tracking

**MANDATORY**: Log all AI usage for cost tracking.

```typescript
// ✅ Good: Log AI usage after every request
import { logAIUsage } from '@/lib/ai/cost-tracker';

const result = await streamText({ model, messages });

await logAIUsage({
  userId: context.userId,
  tenantId: context.tenantId,
  modelUsed: model.id,
  inputTokens: result.usage.inputTokens,
  outputTokens: result.usage.outputTokens,
  cost: calculateCost(result.usage, model),
  taskType: 'chat',
});
```

### Streaming Best Practices

- **Always use streaming** for better UX
- Use `streamText` from Vercel AI SDK
- Return `toDataStreamResponse()` for Edge Functions
- Handle errors gracefully with user-friendly messages

## Tool Development

### Creating a New AI Tool

Tools are the core of AI system functionality. Each tool represents an action the AI can take.

#### Tool Structure

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myNewTool = tool({
  name: 'my_new_tool',
  description: 'Clear description of what this tool does for the AI model',

  // Define parameters with Zod schema
  parameters: z.object({
    requiredParam: z.string().describe('What this parameter is for'),
    optionalParam: z.string().optional().describe('Optional parameter'),
  }),

  // Required permission (from use-permissions.ts)
  requiredPermission: 'manage_apprentices',

  // Execute function
  execute: async (params, context) => {
    // 1. Validate permissions (always first)
    if (!context.permissions.can('manage_apprentices')) {
      throw new Error('Permission denied: manage_apprentices required');
    }

    // 2. Execute action (call Supabase API)
    const response = await fetch(`${context.apiUrl}/api/db/table`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        tenant_id: context.tenantId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    // 3. Return success result
    return {
      success: true,
      message: 'Action completed successfully',
      data: result,
    };
  },
});
```

#### Tool Best Practices

1. **Clear Descriptions**: AI models use descriptions to decide when to call tools
2. **Permission Checks**: ALWAYS check permissions before execution
3. **Tenant Isolation**: Include `tenant_id` in all database operations
4. **Error Handling**: Return meaningful error messages
5. **Type Safety**: Use Zod schemas for parameter validation
6. **Idempotency**: Consider if multiple calls should be safe
7. **Confirmation**: Destructive actions should require user confirmation

### Tool Categories

Organize tools by category:

**CRUD Tools** (`crud-tools.ts`)
- `create_apprentice`, `update_employer`, `delete_contact`

**Report Tools** (`report-tools.ts`)
- `generate_compliance_report`, `generate_financial_report`

**Workflow Tools** (`workflow-tools.ts`)
- `create_workflow`, `activate_workflow`, `configure_trigger`

**Timesheet Tools** (`timesheet-tools.ts`)
- `approve_timesheet`, `reject_timesheet`, `bulk_approve`

**Search Tools** (`search-tools.ts`)
- `search_entities`, `semantic_search`, `advanced_filter`

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/ai/tools/index.test.ts
```

### Writing Tests

- **TypeScript**: Use Vitest
- **Minimum coverage**: 80% for AI system code
- **Test file naming**: `*.test.ts` or `*.spec.ts`

#### Example Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeTool } from '@/lib/ai/tools';

describe('Tool Execution', () => {
  it('should check permissions before execution', async () => {
    const tool = createApprenticeTool;
    const context = {
      permissions: { can: vi.fn().mockReturnValue(false) },
      userId: 'user-1',
      tenantId: 'tenant-1',
    };

    await expect(
      executeTool(tool, { firstName: 'John', lastName: 'Smith' }, context)
    ).rejects.toThrow('Permission denied');

    expect(context.permissions.can).toHaveBeenCalledWith('manage_apprentices');
  });

  it('should include tenant_id in database calls', async () => {
    const tool = createApprenticeTool;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ id: 'apprentice-1' }),
    });

    global.fetch = mockFetch;

    await executeTool(tool, { firstName: 'John' }, context);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"tenant_id":"tenant-1"'),
      })
    );
  });
});
```

### Integration Tests

Test complete user flows:

```typescript
describe('AI Assistant Integration', () => {
  it('should create apprentice via AI chat', async () => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Create apprentice named John Smith' },
        ],
        userId: 'user-1',
        tenantId: 'tenant-1',
      }),
    });

    const reader = response.body?.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const result = parseStreamedResponse(chunks);
    expect(result.toolInvocations).toContainEqual({
      toolName: 'create_apprentice',
      state: 'result',
      result: { success: true },
    });
  });
});
```

## Pull Request Process

1. **Fork the repository** and create a feature branch
2. **Follow code style guidelines**
3. **Write tests** for new functionality (80% coverage minimum)
4. **Run linting**: `pnpm run lint`
5. **Run tests**: `pnpm test`
6. **Format code**: `pnpm run format`
7. **Update documentation** if adding features
8. **Commit with conventional format**: `feat(ai): add new tool`
9. **Push and create PR** with clear description
10. **Address review feedback**
11. **Ensure CI passes**

### PR Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Type checking passes (`pnpm run typecheck`)
- [ ] Code formatted (`pnpm run format`)
- [ ] Documentation updated (if needed)
- [ ] No security vulnerabilities introduced
- [ ] Permission checks in place for new tools
- [ ] Tenant isolation maintained
- [ ] Cost tracking added for AI operations
- [ ] Breaking changes documented

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### Scopes

- `ai`: AI system changes
- `tools`: Tool registry changes
- `workflow`: Workflow engine changes
- `ui`: UI component changes
- `api`: API endpoint changes
- `docs`: Documentation
- `cost`: Cost tracking
- `permissions`: Permission system

### Commit Message Examples

```bash
feat(ai): add bulk_update_status tool for batch operations
fix(tools): correct permission check in create_apprentice
docs(ai): update tool registry documentation
refactor(workflow): simplify condition evaluation logic
test(ai): add integration tests for tool execution
chore(deps): update Vercel AI SDK to v6.0.2
```

## Documentation Standards

### File Naming Convention

All documentation must follow the vex-inspired naming convention:

```
YYYYMMDD-name-function-versionSTATUS.md
```

**Examples:**
- `20260227-tool-registry-spec-v1.0.0.md`
- `20260227-setup-guide-v1.1.0.md`
- `20260301-new-feature-v1.0.0-DRAFT.md`

**Status Suffixes:**
- `-DRAFT`: Work in progress
- `-REVIEW`: Under review
- `-FINAL`: Approved
- Or version number for final docs (e.g., `-v1.0.0`)

### Document Header Template

```markdown
# Document Title

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** Final
**Author:** Development Team
**Supersedes:** N/A (or previous version reference)

---

[Document content]
```

### Version Control

- **Major changes** = major version bump (v1.0.0 → v2.0.0)
- **Minor updates** = minor version bump (v1.0.0 → v1.1.0)
- **Corrections** = patch version bump (v1.0.0 → v1.0.1)

### Frozen Facts

Critical constants and decisions are documented in `reference/frozen-facts` and are **NEVER modified without explicit approval**.

**Examples of frozen facts:**
- Model IDs and pricing
- Permission names
- Tool naming conventions
- API endpoint patterns

Changes to frozen facts require:
1. Discussion with team
2. Update version in frozen facts document
3. Document rationale for change
4. Update all affected documentation

## Security Considerations

### Permission Enforcement

**CRITICAL**: Every tool MUST check user permissions before execution.

```typescript
// ✅ Good: Check permissions first
if (!context.permissions.can('manage_apprentices')) {
  throw new PermissionError('Permission denied');
}

// ❌ Bad: Execute without checking
await fetch(`/api/db/apprentices`, { method: 'POST', ... });
```

### Tenant Isolation

**CRITICAL**: All database operations MUST include tenant_id.

```typescript
// ✅ Good: Include tenant_id
body: JSON.stringify({
  ...data,
  tenant_id: context.tenantId,
})

// ❌ Bad: No tenant_id (data leak risk)
body: JSON.stringify(data)
```

### Input Validation

- All tool parameters validated with Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention in chat messages

### Rate Limiting

- AI API calls should be rate-limited per user/tenant (future)
- Tool execution throttled to prevent abuse (future)
- Cost limits configurable per tenant (future)

### Audit Logging

- All AI actions logged with user/tool/result
- Failed permission checks logged
- Workflow executions tracked

## Questions?

If you have questions about contributing:

1. Check this CONTRIBUTING.md
2. Review Setup Guide *(planned)*
3. Search existing [GitHub Issues](https://github.com/bsuite/crm7/issues)
4. Ask in #ai-development Slack channel
5. Open a new issue with the `ai-question` label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Remember:** Permission checks and tenant isolation are not optional. They're the foundation of secure multi-tenant AI operations. When in doubt, check permissions first.
