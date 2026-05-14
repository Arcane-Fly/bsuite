# bsuite-zod-validation — Skill

**Scope**: All BSuite apps (crm7, R80.3, braden, business-suite-unified, conduit, throughput) and packages.  
**Zod version**: `4.4.3` (locked across the suite; never regress to Zod 3 patterns).

---

## 1. Zod 4 Top-Level Format Functions

Zod 4 introduced standalone validators for common string formats. These are **faster**, produce **better error messages**, and are the canonical BSuite pattern. Use them everywhere in place of the deprecated `z.string().format()` chain.

### 1.1 Replacement Table

| Deprecated (Zod 3 / legacy Zod 4) | ✅ Canonical (Zod 4) |
|-----------------------------------|----------------------|
| `z.string().email()` | `z.email()` |
| `z.string().uuid()` | `z.uuid()` |
| `z.string().url()` | `z.url()` |
| `z.string().cuid()` | `z.cuid()` |
| `z.string().cuid2()` | `z.cuid2()` |
| `z.string().ulid()` | `z.ulid()` |
| `z.string().datetime()` | `z.datetime()` |
| `z.string().ip()` | `z.ip()` |

> **Do NOT replace** `z.string().min()`, `z.string().max()`, `z.string().regex()`,  
> or any `.refine()` call — these are not format functions.

### 1.2 Chained Modifiers — Preserved as-is

Modifiers (`.nullable()`, `.optional()`, `.min()`, `.default()`, etc.) attach to the
**format schema**, not the string schema:

```ts
// ✅ Correct
z.email().optional()
z.uuid().nullable()
z.url().default('https://example.com')

// ❌ Wrong (legacy, pre-codemod)
z.string().email().optional()
z.string().uuid().nullable()
```

### 1.3 Type Differences (important!)

`z.uuid()` returns `ZodUUID`, not `ZodString`. For code that must accept the
inferred type as a `string` variable, `z.infer<typeof schema>` still resolves to
`string` — no consumer change needed.

### 1.4 UUID Validation Is Stricter in Zod 4

Zod 4 enforces RFC 4122 UUID versions 1–8. Only the **nil UUID**
(`00000000-0000-0000-0000-000000000000`) and the **max UUID**
(`ffffffff-ffff-ffff-ffff-ffffffffffff`) are allowed with version `0` / `f`.

**Test fixture pattern** (use these instead of hand-crafted hex strings):

```ts
// ✅ Valid UUID v4 — passes Zod 4 z.uuid()
const VALID_UUID = '00000000-0000-4000-8000-000000000001';
//                              ↑            ↑
//                          version=4   variant=8 (RFC 4122)

// ✅ Nil UUID — also valid in Zod 4
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// ❌ Invalid — version 0, not version 1-8 (Zod 3 accepted, Zod 4 rejects)
const BAD_UUID = '00000000-0000-0000-0000-000000000001';
```

---

## 2. `z.discriminatedUnion()` for Tagged Unions

Use `z.discriminatedUnion()` instead of `z.union()` whenever there is a
literal discriminant field. It validates faster (O(1) lookup) and produces
precise per-variant error messages.

```ts
// ✅ Canonical pattern
export const WidgetPropsSchema = z.discriminatedUnion('type', [
  DataTablePropsSchema,   // type: z.literal('DataTable')
  StatGridPropsSchema,    // type: z.literal('StatGrid')
  EntitySelectorPropsSchema,
]);

// ❌ Avoid — slower and produces union-error noise
export const WidgetPropsSchema = z.union([
  DataTablePropsSchema,
  StatGridPropsSchema,
]);
```

**Key rules:**
- Every variant MUST have a `z.literal(...)` discriminant at the same field name.
- The discriminant field must be present in every object of the union.
- Use `z.infer<typeof WidgetPropsSchema>` to get a TypeScript discriminated union type.

---

## 3. `z.toJSONSchema()` for OpenAPI / AI Tool Schemas

Zod 4 ships a built-in JSON Schema emitter. Use it for OpenAPI spec generation
and for AI tool definitions (Vercel AI SDK `tools` object).

```ts
import { z, ZodType } from 'zod';

// Schema definition
const ContactSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(1).max(200),
  role: z.enum(['admin', 'member', 'viewer']),
});

// ✅ Emit JSON Schema — zero external libraries
const jsonSchema = z.toJSONSchema(ContactSchema);
// → { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, ... } }

// ✅ AI tool definition
const createContactTool = {
  description: 'Create a new contact record',
  parameters: z.toJSONSchema(ContactSchema.omit({ id: true })),
};
```

> **Reference**: `crm7/src/lib/ai/` — AI routes use `z.toJSONSchema()` for tool
> parameter definitions passed to the Vercel AI Gateway.

---

## 4. `safeParse` on Every Trust Boundary

Schemas must be enforced at **trust boundaries** — never trust data that crosses
a process or network boundary without validation.

```ts
// ✅ Required patterns
import { z } from 'zod';
import { ContactSchema } from '@/schemas/contact';

// API route handler
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ContactSchema.safeParse(body);  // ← safeParse, not parse
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  // parsed.data is typed and safe to use
  return createContact(parsed.data);
}

// Supabase RPC response validation
const { data, error } = await supabase.rpc('get_contact', { id });
const validated = ContactSchema.safeParse(data);

// Form submit (React Hook Form + Zod resolver)
const form = useForm<z.infer<typeof ContactSchema>>({
  resolver: zodResolver(ContactSchema),
});
```

**Never use `parse()` in production code** — it throws, which can expose internal
schema details in error responses. Use `safeParse()` and handle the failure path
explicitly.

**Trust boundaries (minimum enforcement points):**
- Incoming HTTP request bodies (API routes / edge functions)
- Supabase RPC / DB response data (especially when casting `as unknown`)
- URL search params or path params from Next.js/Vite
- `localStorage` / `sessionStorage` reads
- Inter-app OAuth token payloads (already handled by `@bsuite/auth` JWKS)

---

## 5. Shared Schemas in `packages/schema-registry`

Central Zod schemas live in `@bsuite/schema-registry`. This prevents duplication
across the 6 apps and ensures consistent validation rules.

### 5.1 Package structure

```
packages/schema-registry/src/
  schemas/
    widgetProps.ts   ← widget/page-builder schemas
    ...
  react/
    ...
```

### 5.2 When to add a schema here vs in an app

| Location | When to use |
|----------|-------------|
| `packages/schema-registry` | Cross-app entity shapes, page builder/widget props, shared DB row types |
| `packages/schema-builder` | Schema canvas domain objects (node, edge, relation) |
| `crm7/src/schemas/` | CRM-only entities (Opportunity, Placement, etc.) |
| App `src/schemas/` | App-local forms and API payloads |

### 5.3 Schema pattern in schema-registry

```ts
import { z } from 'zod';  // Always from zod package, not a sub-path

// Use Zod 4 top-level format functions
export const EntityRefCellPropsSchema = z.object({
  type: z.literal('EntityRefCell'),
  tenant_id: z.uuid().optional(),       // ✅ z.uuid(), NOT z.string().uuid()
  entity_id: z.uuid(),                  // ✅ z.uuid(), NOT z.string().uuid()
  entity: z.string().min(1),
  display_field: z.string().min(1),
  foreign_app_scope: z.enum(['bsu', 'crm7', 'conduit', 'r80', 'braden', 'all']),
});

export type EntityRefCellProps = z.infer<typeof EntityRefCellPropsSchema>;
```

### 5.4 `z.record()` in Zod 4

Zod 4 changed `z.record()` to require an explicit key type:

```ts
// ✅ Zod 4 — explicit key type
z.record(z.string(), z.unknown())

// ❌ Zod 3 legacy — no longer valid in Zod 4
z.record(z.unknown())
```

---

## 6. Codemod: Running the Zod 4 Format Function Migration

The repo ships a codemod at `scripts/zod4-codemod.mjs` that automates the
`z.string().format()` → `z.format()` migration.

```bash
# Dry run — see what would change
node scripts/zod4-codemod.mjs --dry-run

# Apply to all in-scope directories (packages + app src directories)
node scripts/zod4-codemod.mjs

# Apply to a specific path only
node scripts/zod4-codemod.mjs packages/schema-registry/src
```

The codemod handles all 8 format functions and preserves chained modifiers.
After running, always:
1. Run `pnpm typecheck` per package
2. Run `pnpm test` per package
3. Update any test fixtures that use non-RFC-4122-compliant UUIDs (see §1.4)

---

## 7. Anti-Patterns (Banned)

```ts
// ❌ Legacy string chains — replaced by Zod 4 top-level
z.string().email()
z.string().uuid()
z.string().url()

// ❌ Zod 3 z.record() one-arg form
z.record(z.unknown())           // → z.record(z.string(), z.unknown())

// ❌ Throwing parse in trust-boundary code
schema.parse(untrustedData)     // → schema.safeParse(untrustedData)

// ❌ z.union() when discriminant field exists
z.union([A, B, C])              // → z.discriminatedUnion('type', [A, B, C])

// ❌ Hardcoded type assertion bypassing schema
const data = response as Contact  // → ContactSchema.safeParse(response)

// ❌ Non-RFC-4122 test UUIDs (Zod 4 will reject)
'00000000-0000-0000-0000-000000000001'  // version 0 — invalid
// Use: '00000000-0000-4000-8000-000000000001'  (version 4, variant 8)
```

---

## 8. Cross-References

- **AGENTS.md §4** — "Zod 4.4.3 locked across all 6 apps"
- **Issue** — `[hardening 4.1] Zod 4 codemod: Phase 4.1`
- **Codemod script** — `scripts/zod4-codemod.mjs`
- **Smithery reference** — `secondsky/zod` (REFERENCE only — do not auto-apply)
- **Zod 4 docs** — https://zod.dev/v4
