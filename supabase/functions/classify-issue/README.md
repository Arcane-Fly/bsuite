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
