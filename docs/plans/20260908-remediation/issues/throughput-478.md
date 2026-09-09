# Throughput is the only app in the estate without a header or sidebar: a horizontal top nav where every other app mounts the shared shell

https://github.com/GaryOcean428/throughput/issues/478

Snapshot updatedAt: 2026-09-06T12:33:14Z. Open at capture; re-read live.

Operator, 2026-09-06 19:52 AWST: *"Throughput has inconsistent navigation with the rest of the apps."*

**Measured 12:00Z on production**, signed in as the seeded identity (`e2e@crm7.app`), 1440 wide, read-only DOM probe. Evidence: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-06/operator-1952-throughput-nav-jodie/` (`nav-class.json`, screenshots `nav-<app>-*-1440.png`).

| app (host · SHA) | `<header>` landmark | sidebar | sidebar toggle | nav orientation | Manuals link | nav-core branding slots |
|---|---|---|---|---|---|---|
| BSU · suite.crm7.app · `9292b84` | yes | yes | yes | vertical | yes | 3 |
| crm7 · crm.crm7.app · `ce4ff81` | yes | yes | yes | vertical | yes | 3 |
| conduit · conduit.crm7.app · `9770eb4` | yes | yes | no | vertical | no | 0 |
| R80.4 · r8.crm7.app · `10187e2` | yes | yes | no | vertical | no | 0 |
| **throughput · ideas.crm7.app · `c3590cf`** | **no** | **no** | no | **horizontal** | no | 0 |

Throughput is the only app in the estate with no `<header>` landmark and no sidebar (`<aside>` or `data-sidebar`). It renders one unlabelled `<nav>` with 13 links across the top — *Throughput · Ideas · New Idea · Dashboard · Launch Pad · Analytics · Teams · Pricing · e2e* — no sidebar toggle, no Manuals entry, and none of the nav-core `data-slot="sidebar"/"header"` branding slots the two tenant apps carry. It does mount the `@bsuite/ui` AppShell (`data-slot="app-shell-main"` present) and imports `AppSwitcher` from `@bsuite/nav-core`; the divergence is the chrome, not the dependencies — `src/components/Navigation.tsx` is a bespoke top bar.

**What consistent means here:** the left sidebar + header shell the other four apps mount, with BSU and crm7 as the reference: a header carrying the app wordmark, Manuals, account chip and tenant; a vertical sidebar with a labelled `nav` and a toggle. `@bsuite/nav-core` already exports `useSidebarState`, `MobileSidebarDrawer`, `useFilteredNav`, `mergeNavConfigs`.

**Same probe, already on bsuite#3119's verification:** the horizontal bar's account chip overhangs the viewport at 1024 and 768 (fix lane `.wt-thr-overflow` in flight). A shell rebuilt on the shared pattern removes that class instead of patching it — worth deciding before the patch merges.

**Not in this class, so nobody over-counts:** conduit and R80.4 lack the toggle and the Manuals link but carry the header and a vertical sidebar. A separate item if the operator wants those two aligned to BSU/crm7.

**Owner:** needs a named maker lane and a PR (operator rule 2026-09-06 11:14: every filed issue owned with a plan). Visual DoD on `d.ideas.crm7.app` before promotion; cells at 1440/1024/768/390 × light/dark, signed in. Filed by `claude-code-bsuite-accountability`.

