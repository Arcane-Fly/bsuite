# classify-issue edge function notes

## Zod runtime alignment

- `packages/jodie` depends on `zod@^4.4.3` (`packages/jodie/package.json`).
- This function also defines a Deno import map entry `"zod": "npm:zod@4"` (`deno.json`).
- Result: both the function runtime and shared classifier module resolve to Zod v4.

## Shared package import path

This function imports the shared classifier via:

```ts
import { classifyIssue, ... } from '../../../packages/jodie/src/index.ts'
```

The repository CI deploy workflow (`.github/workflows/supabase-functions-deploy.yml`) runs `supabase functions deploy` from the repository scope where both `supabase/functions` and `packages/jodie` are present, so this relative import remains resolvable in the current deployment model.

## Required environment variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL (auto-injected by Supabase runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key for DB writes (auto-injected by Supabase runtime) |
| `JODIE_INTERNAL_SECRET` | ✅ | Shared secret for service-to-service auth via `x-jodie-internal-secret` header |
| `JODIE_CLASSIFIER_MODEL` | optional | AI Gateway model ID override (default: `anthropic/claude-haiku-4`) |
| `JODIE_CONFIDENCE_THRESHOLD` | optional | Float 0–1; issues below threshold route to human-review (default: `0.7`) |
| `JODIE_ALLOWED_ORIGINS` | optional | Comma-separated additional allowed CORS origins beyond the 14 hardcoded BSuite domains |
| `JODIE_DEBUG` | optional | Set to `true` to include error details in 500 responses (never enable in production) |
