# BSuite per-feature Definition-of-Done enforcement prompt

**v1.00W · 2026-08-26 · parameterised master template**

One prompt. Instantiate it per feature by substituting `{{...}}` from a row of
`bsuite-feature-index.json`. Every substitution is a field that already exists on the row —
nothing here needs to be invented at dispatch time.

The gate is `~/.agents/skills/agent-definition-of-done/`. Its authority is
`scripts/gate_report.py`; its full UX gate is `references/ux-gate-d8.md`; the evidence shape is
`references/checklist-d1-d8.md`. **This prompt does not restate the gate — it feeds it.** If this
prompt and the skill ever disagree, the skill wins.

---

## Before you dispatch: the two preconditions

**1. The enforcer must actually load.** `completion-enforcer` and `accountability-agent` exist in
`~/.agents/agents/` and carry the D8 hard stop. Confirm they are exposed to the CLI session that
will run this:

```bash
ls -la ~/.claude/agents/ | grep -E 'completion-enforcer|accountability-agent'
```

If that returns nothing, the enforcer is not in the room and every APPROVE is self-report. Fix it
before dispatching anything:

```bash
ln -sf ~/.agents/agents/completion-enforcer.md   ~/.claude/agents/completion-enforcer.md
ln -sf ~/.agents/agents/accountability-agent.md  ~/.claude/agents/accountability-agent.md
```

**2. The gate script must run.** `gate_report.py` returns exit 0 even on SEND_BACK by design —
callers are expected to read the `status` field. In CI, set `GATE_STRICT=1` to make SEND_BACK
non-zero. A gate that cannot run its script is a `SEND_BACK(D2)`, never an APPROVE on vibes.

---

## The prompt

> ## Objective lock
>
> Bring the BSuite feature **`{{name}}`** (`{{id}}`) to Definition of Done.
>
> `objective_lock`: `{{id}} reaches gate APPROVE with fresh evidence`
> `index_key`: `bsuite_feature_index`
> `silo`: `bsuite`
>
> You may not widen this objective. If the work reveals a second feature that also needs
> attention, record it and return it in your report — do not start it.
>
> ## What this feature is, from the index
>
> | | |
> |---|---|
> | Module | `{{module}}` |
> | Capability area | `{{capability_area}}` |
> | Surface type | `{{surface_type}}` |
> | Entry point | `{{entry_point}}` |
> | Route | `{{route}}` |
> | Build status as indexed | `{{build_status}}` |
> | `ui_touched` | `{{ui_touched}}` |
> | Doc coverage | `{{doc_coverage}}` |
>
> **Code anchors** — start here, these are the files that implement it:
> ```
> {{code_anchors}}
> ```
>
> **Database objects** this feature touches:
> ```
> {{db_objects}}
> ```
>
> **Documentation** — read every `current` doc before you touch code. `{{doc_count}}` docs are
> linked to this feature:
> ```
> {{docs}}
> ```
> If `doc_coverage` is `undocumented`, say so explicitly in D3 and do not invent a source. If it is
> `archive-only`, the linked docs are historical and may describe a predecessor — treat them as
> context, not as specification.
>
> ## The sibling denominator — read this before you start, not at the end
>
> This feature's `sibling_class` is **`{{sibling_class}}`**, and **`{{sibling_count}}` rows in the
> index share it**.
>
> Enumeration method: `{{sibling_enumeration_method}}`
>
> The full sibling list is in the index. D8.1 requires a *number*, and you already have it — so the
> question is not "how many are there" but "does this defect or pattern exist on the other
> `{{sibling_count}}`". Check. If it does, you fix the class, not the page. "I checked the others"
> without a count is a SEND_BACK, and so is a count you copied from here without looking.
>
> ## Blocking conditions on this feature
>
> ```
> {{compliance_risk}}
> ```
>
> If that block is non-empty, each entry is a **D1 blocking condition**. Do not close this feature
> while an `open` risk stands. Note the `provenance` field on each: `verified against migration SQL`
> means it was read from code; `doc-claim` means a document asserted it and it has not been
> confirmed against running code — **verify a doc-claim yourself before acting on it, and if the
> code is correct, say so and mark the risk closed with your evidence.** Manufacturing risk from a
> stale changelog is as much a defect as missing a real one.
>
> ## What to do
>
> 1. **Read before writing.** The code anchors, the current docs, `AGENTS.md` and `CLAUDE.md` in the
>    module, and the index row itself. Asking a question whose answer is already on record is a
>    defect, not diligence.
> 2. **Establish present state with evidence.** Does the feature do what the index says? Run it.
>    `{{build_status}}` is an indexed hint from a static read — confirm or correct it.
> 3. **Close the gap** between present state and done.
> 4. **Run the gate.** Not "believe you are done" — run it.
>
> ## Evidence
>
> Assemble `evidence.json` **this turn**, from commands you actually ran. The schema is
> `~/.agents/skills/agent-definition-of-done/references/checklist-d1-d8.md`. Pre-filled from the
> index:
>
> ```json
> {
>   "task_id": "dod.{{id}}",
>   "parent_task_id": "{{parent_task_id}}",
>   "silo": "bsuite",
>   "index_key": "bsuite_feature_index",
>   "objective_lock": "{{id}} reaches gate APPROVE with fresh evidence",
>   "waivers": [],
>   "children_gates": [],
>   "ui_touched": {{ui_touched}},
>   "D8_ux_continuity": {
>     "D8_1_impact_traced": {
>       "sibling_surfaces": {
>         "count": {{sibling_count}},
>         "checked": null,
>         "how_enumerated": "{{sibling_enumeration_method}}"
>       }
>     }
>   }
> }
> ```
>
> `checked` is yours to fill and it must be a real number. `count` came from the index; `checked` is
> how many you actually looked at. If those two differ, D8.1 wants to know why in `notes`.
>
> Then:
>
> ```bash
> python3 ~/.agents/skills/agent-definition-of-done/scripts/gate_report.py \
>   --evidence /tmp/evidence-{{id}}.json \
>   --out /tmp/gate-{{id}}.json
> ```
>
> ## D1–D7 — always
>
> | | What this feature specifically needs |
> |---|---|
> | **D1** wired + current | Every anchor above is imported and called. Any `open` entry in the blocking conditions is closed or explicitly waived by the user with a reason. |
> | **D2** evidence pack | Real command output. `"should pass"` is not evidence. For a UI change, screenshots count here **and** as D8 evidence — one pass, both gates. |
> | **D3** context complete | `index_key` and `objective_lock` present; module `AGENTS.md` read; the `{{doc_count}}` linked docs read, or their absence stated. |
> | **D4** memory | Read the `bsuite_` silo keys. `bsuite_` is owned by this silo — check `~/.agents/scripts/silo-guard.sh <key>` before any write, and refuse on an ambiguous silo rather than guessing. |
> | **D5** correction absorb | Any steer the user gave this turn is written back to the index row and the relevant skill **the same turn**, not deferred. |
> | **D6** children | Every child gate APPROVE, or you are not done. |
> | **D7** no false-complete | The thing is invoked from somewhere real. `{{build_status}}` being `unwired` in the index means this row starts life failing D7 — wiring it is the work, not a bonus. |
>
> ## D8 — the UX gate
>
> **`ui_touched` for this feature is `{{ui_touched}}`.**
>
> If `true`, D8 applies in full and every sub-row needs its own evidence — see
> `~/.agents/skills/agent-definition-of-done/references/ux-gate-d8.md`. The rows that fail most often
> here:
>
> - **D8.1** — you have `{{sibling_count}}` above. State `checked`. A denominator without a numerator
>   is not a check.
> - **D8.5** — ask it literally, out loud, of the task the user is trying to finish: **does completing
>   this require leaving the page?** Preferred answer is to bring the thing inline. A departure whose
>   return is lossy — empty field, lost scroll, retyped work, the new record not selected — is a
>   **fail**, not partial credit.
> - **D8.6** — name one alternative and why it lost. "That is how it already worked" is not a reason,
>   and neither is "that is what was asked for".
>
> If `false`, D8 is `n/a` — but say `n/a`, do not leave it absent. `gate_report.py` treats a missing
> `ui_touched` as its own gap, because "no UI changed" and "I forgot the UX gate" are
> indistinguishable to a gate that defaults to skipping.
>
> **Do not silently flip `ui_touched` to `false` to avoid D8.** If you believe the index has it wrong,
> say so, give your reason, and let the enforcer rule. A backend change that a page consumes is
> `true`. A copy-only change is `true`.
>
> ## Returning
>
> Run `completion-enforcer`. It returns `APPROVE` + evidence pack + partial scores, or
> `SEND_BACK(gaps[])`.
>
> - **SEND_BACK and you are a child** → return the gaps to your **parent only**. The parent rebriefs
>   with a stronger delta and requeues. Do not surface to the user, and do not drop
>   `objective_lock` on the requeue.
> - **SEND_BACK and you are main** → surface to the user.
> - **APPROVE** → you may claim done, citing the evidence. Then write back to the index row:
>   `dod_status`, the corrected `build_status` if your evidence contradicted the indexed hint, and
>   any doc you created for a row that was `undocumented`.
>
> No completion claims without gate APPROVE and fresh evidence. Agent success reports are not
> evidence.

---

## Dispatch order

The index is not a flat queue. Run it in this order, because later batches depend on earlier ones
being true:

| Batch | Selector | Rows | Why first |
|---|---|---|---|
| 1 | `compliance_risk` non-empty with `state: open` | 30 | Money and tenancy correctness. Verify each against code before acting — several are doc-claims the owner believes are already fixed. |
| 2 | `build_status == "unwired"` | 100 | These fail D7 by definition. Each is either wired or removed — there is no third state. |
| 3 | `build_status in ("partial","scaffold")` | 27 | Renders as progress, is not. |
| 4 | `doc_coverage == "undocumented"` and `ui_touched` | 48 | A user-facing surface nobody wrote down. |
| 5 | `sibling_count >= 10`, one representative per `sibling_class` | ~12 classes | Fix the class once, then sweep. Doing this before batch 6 collapses most of it. |
| 6 | everything remaining | 474 | |

Within a batch, order by `sibling_class` so one agent holds the pattern across its siblings rather
than re-learning it per row.

## Parent-owned requeue

```
child emits SEND_BACK -> parent only
parent rebriefs (stronger delta, add overrides) and requeues, objective_lock intact
parent escalates to user only when genuinely stuck:
  ambiguous requirement, needs a waiver, or irreversible
main/final SEND_BACK always surfaces to the user
```

A parent that forwards every child SEND_BACK to the user has broken the loop. A parent that drops a
child gap has broken the gate.

## Substitution reference

| Token | Index field |
|---|---|
| `{{id}}` `{{name}}` `{{module}}` `{{capability_area}}` | direct |
| `{{surface_type}}` `{{entry_point}}` `{{route}}` | direct |
| `{{code_anchors}}` `{{db_objects}}` | join with newlines |
| `{{build_status}}` `{{ui_touched}}` `{{doc_coverage}}` `{{doc_count}}` | direct |
| `{{docs}}` | `path (why; status)` per line |
| `{{sibling_class}}` `{{sibling_count}}` `{{sibling_enumeration_method}}` | direct |
| `{{compliance_risk}}` | pretty-printed JSON, or `none` |
| `{{parent_task_id}}` | supplied by the dispatcher, `null` for main |

## What this prompt deliberately does not do

It does not restate D1–D8. The gate text lives in one place and a copy would drift from it — which is
the same failure mode as the eleven sibling pages nobody counted.
