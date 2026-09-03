# Loop contract — Jodie proposes, you save

Plan: [`../20260904-jodie-proposes-and-you-save-v1.00W.md`](../20260904-jodie-proposes-and-you-save-v1.00W.md)

`ui_touched`: **YES** — the Jodie panel renders forms a person edits and saves. D8 applies to
every item below that touches it.

Item 1 gates the rest: if the spike says the app's forms cannot be lifted out of their
routes, the design changes and this contract is rewritten before any tool is converted.

```json
{
  "items": [
    {
      "id": "spike-forms-liftable",
      "what": "Three crm7 forms of different shapes render outside their route, pre-filled, and save through their own service. Go/no-go, and the registry's home named.",
      "gates": ["all"],
      "resolve": { "evidence": "docs/validation/20260904-jodie-form-lift-spike.md" }
    },
    {
      "id": "dial-reaches-the-tools",
      "what": "ToolExecutionContext carries the resolved automation level and createToolRegistry filters by it. Bite: at `off` the registry contains no write tool. Closes finding 1 and may ship alone.",
      "resolve": { "evidence": "docs/validation/20260904-jodie-dial-gates-tools.md" }
    },
    {
      "id": "write-intent-registry",
      "what": "registerWriteIntent + resolver, zod schema as the single validator, no consumers yet.",
      "resolve": { "evidence": "docs/validation/20260904-jodie-write-intent-registry.md" }
    },
    {
      "id": "panel-renders-an-intent",
      "what": "The Jodie panel renders a registered Form inline, pre-filled, saving through the app's own service. Inline create for related records — a departure from the panel to fetch a related record is a FAIL, not partial credit.",
      "resolve": { "evidence": "docs/validation/20260904-jodie-panel-renders-intent.md" }
    },
    {
      "id": "no-module-writes-raw",
      "what": "Every AI tool module writes through a registered intent; none writes straight to PostgREST. Ratchet — this number only falls.",
      "resolve": { "baseline": "docs/validation/20260904-jodie-raw-write-modules.json:raw_write_modules==0" }
    },
    {
      "id": "workflows-honour-the-ceiling",
      "what": "The approved design's 'a send node cannot fire on draft', with a test that bites.",
      "resolve": { "evidence": "docs/validation/20260904-jodie-workflow-ceiling.md" }
    },
    {
      "id": "precedent-recorded",
      "what": "The ruling that an assistant's writes use the app's own save path, at every automation level, recorded as precedent.",
      "resolve": { "key": "precedent__bsuite__20260904__an_assistants_writes_go_through_the_apps_own_save_path" }
    }
  ]
}
```
