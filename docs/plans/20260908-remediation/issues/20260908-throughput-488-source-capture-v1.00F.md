---
kind: record
authority: none
owner: bsuite
---

# index.html is a third theme path: it defaults to 'dark' not 'system' and never migrates the legacy key

https://github.com/GaryOcean428/throughput/issues/488

Snapshot updatedAt: 2026-09-06T17:55:56Z. Open at capture; re-read live.

## What

`index.html` carries a **third** theme path — separate from `main.tsx` and the provider — and
it does two things the other two no longer do: it **defaults to `'dark'`** rather than
`'system'`, and it **does not migrate** the legacy `theme` key.

Net rendered behaviour is currently correct, because `main.tsx` runs afterwards and corrects
it. The visible cost is a **one-boot dark flash for a legacy light-mode user**.

## Why file it rather than leave it in a PR body

throughput#487 unified two theme systems onto one key (`bsuite_theme`) and made `system` a
stored mode that resolves to light or dark rather than stamping a dead `class="system"`. This
inline script is the one path that unification did not reach — and it was disclosed in that
PR's body as *"Filed, not fixed"* when no issue existed.

A PR body is not a tracker. Once merged it scrolls out of view, and the only record that a
third theme path exists — in the very change whose subject is that there should be one —
disappears with it. The next person to touch theming will not know.

## Measured

- The inline script is **byte-identical** before and after #487.
- It reads `bsuite_theme` (so it is not on the *old* key), but its fallback is `'dark'`, where
  the provider's is `'system'`.
- It performs no migration of the legacy `theme` key, which #487's provider now deletes.
- Its `data-theme` attribute is read by **nothing** — inert, not live.

## What this needs

Either fold the inline script into the same resolution the provider uses — default `'system'`,
resolve against `prefers-color-scheme`, migrate the legacy key — or delete it and accept the
unstyled first paint, whichever measures better. It exists to avoid a flash; today it causes a
different one for a subset of users.

If it stays, its `data-theme` attribute should either be consumed or removed. An attribute
nothing reads is a claim that something does.

## Acceptance

- One resolution rule across `index.html`, `main.tsx` and the provider — stated in one place
  and referenced from the others.
- A legacy light-mode user (`theme=light`, no `bsuite_theme`) boots **light**, with no dark
  frame, verified on the deployed host.
- `data-theme` is either read by something or gone.

Split out of throughput#487, whose body claimed this was filed. Related: #483, #484, #485, #486.
