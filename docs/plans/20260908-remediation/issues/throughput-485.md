# V-C10: 'Save ~20%' reads 2.62:1 on /pricing and 'Delete Account' 3.37:1 on /settings

https://github.com/GaryOcean428/throughput/issues/485

Snapshot updatedAt: 2026-09-06T13:46:36Z. Open at capture; re-read live.

`visual-probe.js` class **V-C10 `contrast`**, measured against the **composited** background
(ancestor `opacity` folded in) on production `ideas.crm7.app` @ `c3590cf`, signed in as
`e2e@crm7.app`, `prefers-color-scheme` emulated + reloaded, transitions killed. 8 cells.

| # | route | element | text | ink | composited ground | ratio | needs |
|---|---|---|---|---|---|---:|---:|
| 1 | `/pricing` | `span.px-1.5.py-0.5.bg-success` | **"Save ~20%"** | `oklch(0.98 0.006 260)` | `rgb(0 173 174)` | **2.62:1** | 4.5:1 |
| 2 | `/settings` | `div.font-medium.text-danger.dark:text-dark-accent-pink` | **"Delete Account"** | `oklch(0.64 0.24 25)` | `rgb(242 242 242)` | **3.37:1** | 4.5:1 |

Both themes, all four widths.

1 is near-white on the `success` fill — the pill's own background, not the page behind it,
so this is measured on the surface the text actually sits on. `--success` at
`rgb(0 173 174)` is simply too light to carry white type at 14px.

2 is the **destructive** action on the settings page. A control whose whole job is to be
unmistakable is the worst place in the app to be under AA, and `text-danger` is a semantic
token, so this is a token-level pairing rather than a one-page slip: anywhere
`text-danger` sits on the light `--bg-body` it reads 3.37:1.

Neither is an exemption case — neither element is disabled, and the probe's WCAG 1.4.3
incidental branch did not fire on them.

Instrument control ran in every cell (a `#bbbbbb`-on-white pair must be reported at ~1.9:1
and the sanctioned near-white `oklch(0.982 0.002 248)` must **not** be flagged): bit in
168 of 168 cells.

Found by the SHIP lane while enumerating every remaining blocker on bsuite#3119. Reported,
not fixed.

