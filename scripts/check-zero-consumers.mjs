#!/usr/bin/env node
/**
 * check-zero-consumers — fail when a package, token or hook ships with no consumer.
 *
 * WHY THIS IS THE HIGHEST-VALUE GATE ON THE BOARD
 * ----------------------------------------------
 * Of the ten things this estate documented and never delivered, SIX share one shape:
 * the machinery was built and the wiring never happened.
 *
 *   - `--role-border-interactive` minted, 173 files still on the old resting border
 *   - the RAMS funding matrix ratified as an ADR, `to_regclass` returns null
 *   - `@bsuite/jodie`, `@bsuite/eslint-config`, `@bsuite/tsconfig` published, zero apps
 *   - a shared scanner adopted in five apps while its four predecessors stayed live
 *   - a hook published and lockfiled, imported by nobody
 *   - an RPC and a pg_cron poller built, and `useSiteEditor.ts:139` still reads
 *     `// Your existing publish logic here`
 *
 * It does not read as half-finished because nothing shipped. It reads that way because
 * the last 10% — the wiring — is where work stops, and NO GATE MEASURED WIRING.
 *
 * This is that gate. It would have caught five of the ten before they were called done.
 *
 * WHAT IT DOES NOT CLAIM
 * ----------------------
 * Each detector states what it cannot see, and anything it cannot judge is reported as
 * UNVERIFIABLE rather than counted as unused. A gate that guesses gets switched off.
 *
 *   - Tailwind v4 turns `--color-*` tokens declared in an `@theme` block into utility
 *     classes, so a token with no `var()` reference may still be used as `bg-brand-500`.
 *     Those are UNVERIFIABLE here, never "unused".
 *   - Database functions are reached from SQL as often as from PostgREST — a policy, a
 *     trigger, another function's body. `zero POLICY references` has already been
 *     mistaken for `unused` in this estate and a revoke broke an RPC's inner call. SQL
 *     reach needs `pg_proc.prosrc`, which is a live-database question, so RPCs are
 *     reported for review and never failed on. See --rpc-report.
 *
 * RATCHET
 * -------
 * Known cases live in scripts/zero-consumers-baseline.json. The list may only SHRINK: a
 * NEW zero-consumer artifact fails, and a baselined entry that has since gained a
 * consumer also fails, so the file cannot become a place findings go to be forgotten.
 *
 *   node scripts/check-zero-consumers.mjs
 *   node scripts/check-zero-consumers.mjs --self-test
 *   node scripts/check-zero-consumers.mjs --write-baseline
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const BASELINE = 'scripts/zero-consumers-baseline.json'
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

const sh = (cmd, args) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) }
  catch (e) { return e.stdout ?? '' }
}

function listFiles(dirs, exts) {
  const out = []
  const walk = (d, depth = 0) => {
    if (depth > 12 || !existsSync(d)) return
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build') continue
      const p = `${d}/${e.name}`
      if (e.isDirectory()) walk(p, depth + 1)
      else if (exts.some((x) => e.name.endsWith(x))) out.push(p)
    }
  }
  for (const d of dirs) walk(d)
  return out
}

// ---------------------------------------------------------------- packages
export function packageConsumers(ownNames, manifests) {
  const counts = new Map(ownNames.map((n) => [n, []]))
  for (const { path, json } of manifests) {
    const deps = {
      ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}),
      ...(json.peerDependencies ?? {}), ...(json.optionalDependencies ?? {}),
    }
    for (const name of Object.keys(deps)) {
      if (!counts.has(name)) continue
      if (json.name === name) continue                 // a package is not its own consumer
      counts.get(name).push(path)
    }
  }
  return counts
}

// ---------------------------------------------------------------- hooks
export function hookConsumers(hooks, sources) {
  const counts = new Map(hooks.map((h) => [h.name, []]))
  for (const { path, text } of sources) {
    for (const h of hooks) {
      if (path === h.definedIn) continue                // a definition is not a use
      // An identifier reference outside the file that defines it.
      if (new RegExp(`\\b${h.name}\\b`).test(text)) counts.get(h.name).push(path)
    }
  }
  return counts
}

// ---------------------------------------------------------- persistence
/**
 * A FIFTH SHAPE, added 2026-09-02: a service function that reads or writes the
 * database and is called only from inside the service layer.
 *
 * WHY THE EXISTING DETECTORS MISS IT. `check-table-reach` asks whether ANYTHING
 * references a table; `custom_pages` and `form_layouts` are both referenced, so
 * both read as reached. The `package`/`hook`/`token` detectors above ask about
 * artifacts a consumer IMPORTS. Neither asks the question that actually failed:
 * the write happens, the row lands, and nothing ever renders it.
 *
 * MEASURED, both in crm7 on 2026-09-02:
 *   - `savePageRevision` (services/customPageService.ts) — the ONLY function that
 *     can write a custom page's layout after creation — has ZERO callers
 *     anywhere. `custom_page_revisions` has 0 production rows, and Custom Pages
 *     cannot be authored through the interface at all.
 *   - `resolveFormLayout` (services/formLayoutService.ts) is called by exactly
 *     one place, `stores/formLayoutStore.ts`, whose action no component ever
 *     destructures. The Form Layout Builder is a real drag-and-drop builder with
 *     a property panel, and its output has zero render sites.
 *
 * WHY "OUTSIDE THE LAYER" AND NOT "ANY CALLER". A one-hop caller check passes
 * `resolveFormLayout`, because the store does call it. The store is not a
 * screen, so a chain that ends there has not reached anybody. Services calling
 * services, and stores calling services, are both invisible to a user.
 *
 * WHY THIS IS A RATCHET AND NOT A HARD RULE. A service function legitimately
 * used only by another service is real — a shared fetch behind two public
 * functions, for instance. So this REPORTS against a banked list that may only
 * shrink, exactly like the classes above.
 */
export function isServiceLayer(path) {
  return (
    path.includes('/services/') ||
    path.includes('/stores/') ||
    /Service\.tsx?$/.test(path) ||
    /Store\.tsx?$/.test(path)
  );
}

/**
 * Exported functions in the service layer whose body touches persistence.
 *
 * Parses the CONSTRUCT, not the line: a body runs to the next top-level
 * `export` (or end of file), because a `.from(` three lines below a declaration
 * belongs to that declaration and a line-oriented scan would miss it.
 */
export function persistenceExports(sources) {
  const out = [];
  for (const { path, text } of sources) {
    if (!isServiceLayer(path)) continue;
    const decl = /^export\s+(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*[=:])/gm;
    const found = [];
    let m;
    while ((m = decl.exec(text)) !== null) found.push({ name: m[1] || m[2], at: m.index });
    for (let i = 0; i < found.length; i++) {
      const body = text.slice(found[i].at, i + 1 < found.length ? found[i + 1].at : text.length);
      if (body.includes('.from(') || body.includes('.rpc(')) {
        out.push({ name: found[i].name, definedIn: path });
      }
    }
  }
  return out;
}

/**
 * The store ACTION whose body calls `fnName`, per call site in a store file:
 * the nearest property key declared before the call (`publish: async (…) =>`,
 * `publish(…) {`). Returns [] when the call sits outside any action.
 */
export function storeActionsCalling(storeText, fnName) {
  const actions = new Set();
  const call = new RegExp(`\\b${fnName}\\s*\\(`, 'g');
  const key = /^\s{2,6}([A-Za-z_$][\w$]*)\s*(?::\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|\([^)]*\)\s*\{)/gm;
  let m;
  while ((m = call.exec(storeText)) !== null) {
    let owner = null;
    let k;
    key.lastIndex = 0;
    while ((k = key.exec(storeText)) !== null && k.index < m.index) owner = k[1];
    if (owner) actions.add(owner);
  }
  return [...actions];
}

/** Tests exercise code; they do not put it in front of a user. */
export function isTestFile(path) {
  return /(^|\/)__tests__\//.test(path) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
}

/** Line and block comments removed, so prose never counts as a use. */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * True only for real store usage of `action`: a member access (`s.publish`,
 * `getState().publish`) or destructuring straight from a `use…Store(…)` call.
 * A bare word is not enough — actions have names like `resolve` and `remove`,
 * which also name Promise callbacks and unrelated locals.
 */
export function usesStoreAction(code, action) {
  if (new RegExp(`\\.${action}\\b`).test(code)) return true;
  const destructure = new RegExp(
    `\\{[^{}]*\\b${action}\\b[^{}]*\\}\\s*=\\s*use[A-Z][\\w$]*Store\\s*\\(`,
  );
  return destructure.test(code);
}

/**
 * Consumers OUTSIDE the service layer. Its own file never counts, and neither
 * does another service or store BY ITSELF — see the docblock above for why.
 *
 * ONE HOP THROUGH A STORE, added 2026-09-24. crm7's form-layout lifecycle
 * (publish / archive / discard / revisions / restore) is page → store action →
 * service, and the page calls every one of those actions. Counting only direct
 * callers reported all five as zero-consumer. A store call now counts when a
 * SCREEN imports that store module AND names the specific action wrapping the
 * call. A store whose action no screen names still reaches nobody, so the
 * measured `resolveFormLayout` trap still reports zero.
 */
export function persistenceConsumers(exports_, sources) {
  const counts = new Map(exports_.map((e) => [`${e.definedIn}::${e.name}`, []]));
  // A consumer is a screen in the SAME app. A test file exercises a function
  // without reaching a user, and a same-named identifier in another app is a
  // different function — measured 2026-09-24: braden's `createPage` was
  // "consumed" by a crm7 route test holding a local named createPage.
  const screens = sources.filter(({ path }) => !isServiceLayer(path) && !isTestFile(path));
  const appOf = (path) => path.split('/')[0];
  const stores = sources.filter(({ path }) => /\/stores\//.test(path) || /Store\.tsx?$/.test(path));
  for (const e of exports_) {
    const key = `${e.definedIn}::${e.name}`;
    const direct = new RegExp(`\\b${e.name}\\b`);
    for (const { path, text } of screens) {
      if (path !== e.definedIn && appOf(path) === appOf(e.definedIn) && direct.test(text)) {
        counts.get(key).push(path);
      }
    }
    for (const store of stores) {
      if (store.path === e.definedIn || !direct.test(store.text)) continue;
      const actions = storeActionsCalling(store.text, e.name);
      if (actions.length === 0) continue;
      const module = store.path.split('/').pop().replace(/\.tsx?$/, '');
      const importsStore = new RegExp(`from\\s+['"][^'"]*\\b${module}['"]`);
      for (const { path, text } of screens) {
        if (counts.get(key).includes(path) || appOf(path) !== appOf(e.definedIn)) continue;
        if (!importsStore.test(text)) continue;
        const code = stripComments(text);
        if (actions.some((action) => usesStoreAction(code, action))) counts.get(key).push(path);
      }
    }
  }
  // THROUGH ANOTHER SERVICE EXPORT, added 2026-09-25. A shared query helper
  // (`profilesById`, called by `listSignerCandidates` and `listTenantMembers`) and
  // a private step of a public operation (`copyToOrganisation`, called by
  // `deployConfig`) reach a user through the export that calls them, not
  // directly; both were reported as zero-consumer while their callers were on
  // screen. A call inside another export's BODY counts only when that export has
  // a screen consumer itself, to a fixed point — so a chain that never reaches a
  // screen still reports zero, and a mere import or a prose mention never counts.
  // Stores are excluded: they have the precise action rule above, and a store's
  // exported `use…Store` would otherwise count for any screen that imports it.
  const services = sources.filter(
    ({ path }) =>
      isServiceLayer(path) && !isTestFile(path) && !/\/stores\//.test(path) && !/Store\.tsx?$/.test(path),
  );
  const decl = /^export\s+(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*[=:])/gm;
  const bodies = [];
  for (const { path, text } of services) {
    const found = [];
    let m;
    decl.lastIndex = 0;
    while ((m = decl.exec(text)) !== null) found.push({ name: m[1] || m[2], at: m.index });
    for (let i = 0; i < found.length; i++) {
      const body = text.slice(found[i].at, i + 1 < found.length ? found[i + 1].at : text.length);
      bodies.push({ key: `${path}::${found[i].name}`, name: found[i].name, path, code: stripComments(body) });
    }
  }
  const screenUsers = (b) =>
    screens.some(({ path, text }) => path !== b.path && appOf(path) === appOf(b.path) && new RegExp(`\\b${b.name}\\b`).test(text));
  const reached = (b) => (counts.get(b.key)?.length ?? 0) > 0 || screenUsers(b);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of exports_) {
      const key = `${e.definedIn}::${e.name}`;
      if (counts.get(key).length > 0) continue;
      const call = new RegExp(`\\b${e.name}\\s*\\(`);
      const via = bodies.find(
        (b) => b.key !== key && appOf(b.path) === appOf(e.definedIn) && call.test(b.code) && reached(b),
      );
      if (via) {
        counts.get(key).push(via.key);
        changed = true;
      }
    }
  }
  return counts;
}

// ---------------------------------------------------------------- tokens
/**
 * A token declared inside an `@theme` block becomes a Tailwind utility, so absence of
 * `var(--x)` proves nothing about it. Those are UNVERIFIABLE, never "unused".
 */
/**
 * Which token DECLARATIONS were added in this diff? Pure, so the self-test exercises the
 * real parser: a `+` line adding `--x:` is a mint; a `-` line, or a `+` line that merely
 * REFERENCES a token via var(), is not.
 */
export function newDeclsFromDiff(diffText) {
  const out = new Set()
  for (const line of diffText.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    const m = line.match(/^\+\s*(--[a-z0-9][a-z0-9-]*)\s*:/i)
    if (m) out.add(m[1])
  }
  return out
}

export function classifyToken(name, definedInThemeBlock, varRefs) {
  if (varRefs > 0) return 'used'
  if (definedInThemeBlock) return 'unverifiable'
  return 'unused'
}

function selfTest() {
  let bad = 0
  const fail = (m) => { console.error(`  FAIL ${m}`); bad++ }

  // packages
  {
    const counts = packageConsumers(['@bsuite/ui', '@bsuite/orphan'], [
      { path: 'crm7/package.json', json: { name: 'crm7', dependencies: { '@bsuite/ui': '^1.0.0' } } },
      { path: 'packages/ui/package.json', json: { name: '@bsuite/ui', dependencies: {} } },
      // A package listing ITSELF must not count as its own consumer.
      { path: 'packages/orphan/package.json', json: { name: '@bsuite/orphan', dependencies: { '@bsuite/orphan': '1.0.0' } } },
    ])
    if (counts.get('@bsuite/ui').length !== 1) fail('package with one consumer counted wrong')
    if (counts.get('@bsuite/orphan').length !== 0) fail('a package counted ITSELF as a consumer')
  }

  // hooks
  {
    const hooks = [{ name: 'useThing', definedIn: 'packages/ui/src/useThing.ts' }]
    const counts = hookConsumers(hooks, [
      { path: 'packages/ui/src/useThing.ts', text: 'export function useThing() {}' },
      { path: 'crm7/src/A.tsx', text: 'import { useThing } from "@bsuite/ui"; useThing()' },
    ])
    if (counts.get('useThing').length !== 1) fail('hook consumer count wrong (definition must not count)')
    const none = hookConsumers([{ name: 'useOrphan', definedIn: 'p/x.ts' }],
      [{ path: 'p/x.ts', text: 'export const useOrphan = () => {}' }])
    if (none.get('useOrphan').length !== 0) fail('an unused hook was counted as used')
    // A substring must not count: useThingElse is not useThing.
    const sub = hookConsumers([{ name: 'useThing', definedIn: 'p/x.ts' }],
      [{ path: 'p/x.ts', text: 'export const useThing = 1' }, { path: 'a.ts', text: 'useThingElse()' }])
    if (sub.get('useThing').length !== 0) fail('a longer identifier was counted as a use of the shorter one')
  }

  // persistence — the two shapes measured in crm7 on 2026-09-02
  {
    const svc = [
      {
        path: 'crm7/src/services/customPageService.ts',
        text: [
          'export async function getCustomPageBySlug(slug) {',
          '  return supabase.from("custom_pages").select("*")',
          '}',
          'export async function savePageRevision(page) {',
          '  // the .from() is BELOW the declaration line — a line-oriented scan misses it',
          '  return supabase',
          '    .from("custom_page_revisions")',
          '    .insert(page)',
          '}',
          'export function titleOf(page) { return page.title }',
        ].join('\n'),
      },
      {
        path: 'crm7/src/stores/formLayoutStore.ts',
        text: 'import { resolveFormLayout } from "../services/formLayoutService"; resolveFormLayout(x)',
      },
    ]
    const exp = persistenceExports(svc)
    const names = exp.map((e) => e.name)
    if (!names.includes('savePageRevision')) fail('a .from() BELOW the declaration line was missed')
    if (!names.includes('getCustomPageBySlug')) fail('a persisting export was not detected')
    if (names.includes('titleOf')) fail('an export that touches no persistence was counted')

    const counts = persistenceConsumers(exp, [
      ...svc,
      { path: 'crm7/src/pages/custom/[slug].tsx', text: 'getCustomPageBySlug(slug)' },
    ])
    if (counts.get('crm7/src/services/customPageService.ts::getCustomPageBySlug').length !== 1)
      fail('a screen calling a service function was not counted as a consumer')
    if (counts.get('crm7/src/services/customPageService.ts::savePageRevision').length !== 0)
      fail('savePageRevision has zero callers and must report zero')

    // The measured trap: a store DOES call resolveFormLayout, and a store is not a screen.
    const rf = [{ name: 'resolveFormLayout', definedIn: 'crm7/src/services/formLayoutService.ts' }]
    const viaStore = persistenceConsumers(rf, svc)
    if (viaStore.get('crm7/src/services/formLayoutService.ts::resolveFormLayout').length !== 0)
      fail('a call from the STORE layer was counted as reaching a user')

    // One hop through a store: counted only when a screen imports the store AND
    // names the action that wraps the call.
    const lifecycle = [{ name: 'publishFormLayout', definedIn: 'crm7/src/services/formLayoutService.ts' }]
    const store = {
      path: 'crm7/src/stores/formLayoutStore.ts',
      text: [
        'import { publishFormLayout } from "@/services/formLayoutService"',
        'export const useFormLayoutStore = create((set, get) => ({',
        '  publish: async (id) => {',
        '    const current = get().layouts[id]',
        '    await publishFormLayout(id, current)',
        '  },',
        '  unrelated: () => null,',
        '}))',
      ].join('\n'),
    }
    const usesAction = persistenceConsumers(lifecycle, [
      store,
      {
        path: 'crm7/src/pages/settings/form-layout-detail.tsx',
        text: 'import { useFormLayoutStore } from "@/stores/formLayoutStore"; const { publish } = useFormLayoutStore(); publish(id)',
      },
    ])
    if (usesAction.get('crm7/src/services/formLayoutService.ts::publishFormLayout').length !== 1)
      fail('a screen calling the store action that wraps a service call was not counted')
    const importsOnly = persistenceConsumers(lifecycle, [
      store,
      {
        path: 'crm7/src/pages/settings/form-layouts.tsx',
        text: 'import { useFormLayoutStore } from "@/stores/formLayoutStore"; const { unrelated } = useFormLayoutStore()',
      },
    ])
    if (importsOnly.get('crm7/src/services/formLayoutService.ts::publishFormLayout').length !== 0)
      fail('a screen that imports the store but never names the wrapping action was counted')
    const namesWithoutImport = persistenceConsumers(lifecycle, [
      store,
      { path: 'crm7/src/pages/other.tsx', text: 'const publish = () => 1; publish()' },
    ])
    if (namesWithoutImport.get('crm7/src/services/formLayoutService.ts::publishFormLayout').length !== 0)
      fail('a screen naming the action without importing the store was counted')
    const generic = [{ name: 'resolveFormLayout', definedIn: 'crm7/src/services/formLayoutService.ts' }]
    const genericStore = {
      path: 'crm7/src/stores/formLayoutStore.ts',
      text: 'export const useFormLayoutStore = create(() => ({\n  resolve: async (k) => {\n    return resolveFormLayout(k)\n  },\n}))',
    }
    const proseOnly = persistenceConsumers(generic, [
      genericStore,
      {
        path: 'crm7/src/components/FormLayoutRenderer.tsx',
        text: 'import { useFormLayoutStore } from "@/stores/formLayoutStore"\n// rules resolve against the row\nnew Promise((resolve) => resolve(1))\nconst { layouts } = useFormLayoutStore()',
      },
    ])
    if (proseOnly.get('crm7/src/services/formLayoutService.ts::resolveFormLayout').length !== 0)
      fail('a generic action name in a comment or a Promise callback was counted as a store use')
    const selectorUse = persistenceConsumers(generic, [
      genericStore,
      {
        path: 'crm7/src/components/Form.tsx',
        text: 'import { useFormLayoutStore } from "@/stores/formLayoutStore"\nconst resolveLayout = useFormLayoutStore((s) => s.resolve)',
      },
    ])
    if (selectorUse.get('crm7/src/services/formLayoutService.ts::resolveFormLayout').length !== 1)
      fail('a selector reading the wrapping action (s.resolve) was not counted')
    const bradenCreate = [{ name: 'createPage', definedIn: 'braden/src/services/pagesService.ts' }]
    const elsewhere = persistenceConsumers(bradenCreate, [
      { path: 'crm7/src/pages/x.tsx', text: 'const createPage = 1; createPage' },
      { path: 'braden/src/__tests__/pages.test.tsx', text: 'createPage()' },
      { path: 'braden/src/pages/Edit.spec.tsx', text: 'createPage()' },
    ])
    if (elsewhere.get('braden/src/services/pagesService.ts::createPage').length !== 0)
      fail('a test file or a same-named identifier in ANOTHER app was counted as a consumer')
    const sameApp = persistenceConsumers(bradenCreate, [
      { path: 'braden/src/pages/admin/Pages.tsx', text: 'await createPage(draft)' },
    ])
    if (sameApp.get('braden/src/services/pagesService.ts::createPage').length !== 1)
      fail('a screen in the same app calling the function was not counted')

    // Through another service export: counted only when that export reaches a screen.
    const helper = [
      { name: 'profilesById', definedIn: 'crm7/src/services/memberProfiles.ts' },
      { name: 'orphanHelper', definedIn: 'crm7/src/services/memberProfiles.ts' },
      { name: 'mentionedOnly', definedIn: 'crm7/src/services/memberProfiles.ts' },
    ]
    const hop = persistenceConsumers(helper, [
      { path: 'crm7/src/services/memberProfiles.ts', text:
        'export async function profilesById(ids) { return supabase.from("profiles") }\n' +
        'export async function orphanHelper() { return supabase.from("x") }\n' +
        'export async function mentionedOnly() { return supabase.from("y") }\n' },
      { path: 'crm7/src/services/formSubmissionService.ts', text:
        'import { profilesById, mentionedOnly } from "@/services/memberProfiles"\n' +
        'export async function listSignerCandidates(t) { const p = await profilesById(ids); return p }\n' +
        '// mentionedOnly() is not called here\n' +
        'export async function unusedCaller() { return orphanHelper() }\n' },
      { path: 'crm7/src/components/forms/FormSubmissionEditor.tsx', text: 'listSignerCandidates(tenantId)' },
    ])
    if (hop.get('crm7/src/services/memberProfiles.ts::profilesById').length !== 1)
      fail('a helper called by an export that a screen uses was not counted')
    if (hop.get('crm7/src/services/memberProfiles.ts::orphanHelper').length !== 0)
      fail('a helper called only by an export NO screen uses was counted')
    if (hop.get('crm7/src/services/memberProfiles.ts::mentionedOnly').length !== 0)
      fail('an import or a comment mention was counted as a call through a service')

    if (!isServiceLayer('crm7/src/services/x.ts')) fail('services/ not recognised as the layer')
    if (!isServiceLayer('crm7/src/stores/x.ts')) fail('stores/ not recognised as the layer')
    if (isServiceLayer('crm7/src/pages/x.tsx')) fail('a page was classed as the service layer')
  }

  // tokens
  {
    if (classifyToken('--x', false, 3) !== 'used') fail('a referenced token is not "used"')
    if (classifyToken('--x', false, 0) !== 'unused') fail('an unreferenced plain token is not "unused"')
    if (classifyToken('--color-x', true, 0) !== 'unverifiable')
      fail('an @theme token with no var() must be UNVERIFIABLE — Tailwind turns it into a utility')
  }

  // minted-token diff parsing
  {
    const d = [
      '--- a/packages/theme/src/x.css',
      '+++ b/packages/theme/src/x.css',
      '+  --newly-minted: #123;',
      '-  --removed-token: #456;',
      '+  color: var(--already-there);',
      '   --untouched: #789;',
    ].join('\n')
    const got = newDeclsFromDiff(d)
    if (!got.has('--newly-minted')) fail('an added token declaration was not detected as minted')
    if (got.has('--removed-token')) fail('a REMOVED token was counted as minted')
    if (got.has('--already-there')) fail('a var() REFERENCE on an added line was counted as a declaration')
    if (got.has('--untouched')) fail('an unchanged context line was counted as minted')
    if (got.size !== 1) fail(`minted set should hold exactly 1, holds ${got.size}`)
  }

  console.log(
    'check-zero-consumers --self-test: 29 assertions across five detectors — package ' +
      'consumer counting including the self-reference trap, hook counting including the ' +
      'definition-is-not-a-use and substring traps, and token classification including ' +
      'the Tailwind @theme case that must never be called unused, and minted-token diff ' +
      'parsing including the removed-token and var()-reference-on-an-added-line traps, and\n' +
        'persistence-function reach including the two traps that let the real defects ship: a\n' +
        '`.from()` BELOW the declaration line, and a caller that is itself a store rather than a screen;\n' +
        'plus the one-hop store rule (screen must import the store AND use the wrapping action, never a\n' +
        'bare word in prose or a Promise callback) and the same-app, non-test consumer rule.',
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) { console.error('::error::checker failed its own self-test'); process.exit(1) }

  const findings = { package: [], hook: [], token: [], persistence: [] }
  const unverifiable = { token: 0 }

  // ---- packages -----------------------------------------------------------
  const pkgDirs = readdirSync('packages', { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(`packages/${e.name}/package.json`))
    .map((e) => `packages/${e.name}`)
  const ownNames = pkgDirs.map((d) => JSON.parse(readFileSync(`${d}/package.json`, 'utf8')).name).filter(Boolean)

  const manifestPaths = [
    ...pkgDirs.map((d) => `${d}/package.json`),
    'package.json',
    ...APPS.flatMap((a) => (existsSync(`${a}/package.json`) ? [`${a}/package.json`] : [])),
    ...APPS.flatMap((a) => listFiles([`${a}/packages`], ['package.json'])),
  ]
  const manifests = manifestPaths.filter(existsSync).map((p) => {
    try { return { path: p, json: JSON.parse(readFileSync(p, 'utf8')) } } catch { return null }
  }).filter(Boolean)

  // ------------------------------------------------------------------------
  // THE INPUTS MUST BE PRESENT BEFORE ANY VERDICT.
  //
  // The apps are SUBMODULES. In a parent worktree they are empty directories until
  // `git submodule update --init` runs. With no app package.json on disk, every shared
  // package has zero consumers — and the first run of this gate duly reported 14 of 16
  // packages unused, including @bsuite/ui and @bsuite/theme, which every app depends on.
  //
  // That is the estate's most-repeated failure class wearing a different hat: a scan
  // over an empty tree is "could not measure", never a finding. Assert the denominator
  // before drawing any conclusion from it.
  // ------------------------------------------------------------------------
  const missingApps = APPS.filter((a) => !existsSync(`${a}/package.json`))
  if (missingApps.length) {
    console.error(
      `::error::${missingApps.length} of ${APPS.length} app(s) are not checked out ` +
        `(${missingApps.join(', ')}). Every consumer of a shared package lives in an app, so ` +
        `with these absent EVERY package would report zero consumers. That is "could not ` +
        `measure", not a finding. Run with submodules initialised: ` +
        `git submodule update --init --recursive`,
    )
    process.exit(1)
  }

  const pkgCounts = packageConsumers(ownNames, manifests)
  for (const [name, consumers] of pkgCounts) if (consumers.length === 0) findings.package.push(name)

  // ---- hooks --------------------------------------------------------------
  const pkgSrcFiles = listFiles(pkgDirs.map((d) => `${d}/src`), ['.ts', '.tsx'])
  const hooks = []
  for (const f of pkgSrcFiles) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)/g)) {
      hooks.push({ name: m[1], definedIn: f })
    }
  }
  const appSrcFiles = listFiles(APPS.map((a) => `${a}/src`), ['.ts', '.tsx'])
  const sources = [...pkgSrcFiles, ...appSrcFiles].map((p) => ({ path: p, text: readFileSync(p, 'utf8') }))
  const hookCounts = hookConsumers(hooks, sources)
  for (const [name, consumers] of hookCounts) if (consumers.length === 0) findings.hook.push(name)

  // ---- persistence --------------------------------------------------------
  // `sources` already holds every package and app .ts/.tsx, which is exactly the
  // denominator this needs: the definitions live in the app service layer and the
  // consumers that count live in the app screens.
  const persisting = persistenceExports(sources)
  const persistCounts = persistenceConsumers(persisting, sources)
  for (const [key, consumers] of persistCounts) if (consumers.length === 0) findings.persistence.push(key)

  // ---- tokens -------------------------------------------------------------
  const cssFiles = listFiles(['packages/theme/src', 'packages/design-tokens'], ['.css'])
  const allText = [...sources.map((s) => s.text), ...listFiles([...APPS, 'packages'], ['.css']).map((p) => readFileSync(p, 'utf8'))].join('\n')
  const tokens = new Map()
  for (const f of cssFiles) {
    const text = readFileSync(f, 'utf8')
    // Which declarations sit inside an `@theme { … }` block?
    const themeRanges = []
    for (const m of text.matchAll(/@theme[^{]*\{/g)) {
      let depth = 1, i = m.index + m[0].length
      while (i < text.length && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++ }
      themeRanges.push([m.index, i])
    }
    for (const m of text.matchAll(/(--[a-z0-9][a-z0-9-]*)\s*:/gi)) {
      const inTheme = themeRanges.some(([a, b]) => m.index >= a && m.index < b)
      const prev = tokens.get(m[1])
      tokens.set(m[1], { inTheme: (prev?.inTheme ?? false) || inTheme })
    }
  }
  for (const [name, meta] of tokens) {
    const refs = (allText.match(new RegExp(`var\\(\\s*${name}\\b`, 'g')) || []).length
    const verdict = classifyToken(name, meta.inTheme, refs)
    if (verdict === 'unused') findings.token.push(name)
    else if (verdict === 'unverifiable') unverifiable.token++
  }

  for (const k of Object.keys(findings)) findings[k].sort()

  if (process.argv.includes('--write-baseline')) {
    writeFileSync(BASELINE, JSON.stringify({
      _comment: [
        'Artifacts that exist with ZERO consumers, already known. This list may only SHRINK.',
        'A NEW zero-consumer artifact fails the gate; an entry here that has since gained a',
        'consumer ALSO fails, so this cannot become a place findings go to be forgotten.',
        'Regenerate deliberately with --write-baseline; never to make a red run green.',
      ],
      ...findings,
    }, null, 2) + '\n')
    console.log(`wrote ${BASELINE}`)
    return
  }

  let baseline = { package: [], hook: [], token: [] }
  try { baseline = { ...baseline, ...JSON.parse(readFileSync(BASELINE, 'utf8')) } } catch { /* first run */ }

  // A ZERO denominator is "could not measure", never "nothing to measure".
  const denom = { package: ownNames.length, hook: hooks.length, token: tokens.size }
  for (const [kind, n] of Object.entries(denom)) {
    if (n === 0) {
      console.error(`::error::the ${kind} detector found 0 artifacts to examine. That is "could not check", not a clean bill.`)
      process.exit(1)
    }
  }

  // HEAD LINE FIRST — every denominator before any verdict.
  console.log(
    `[zero-consumers] ${denom.package} package(s), ${denom.hook} exported hook(s), ` +
      `${denom.token} theme token(s) examined. Zero-consumer: ` +
      `${findings.package.length} package(s), ${findings.hook.length} hook(s), ` +
      `${findings.token.length} token(s). ` +
      `${unverifiable.token} token(s) UNVERIFIABLE (declared in an @theme block, so Tailwind may ` +
      `emit them as utilities — never counted as unused).`,
  )

  // WHICH TOKEN DECLARATIONS ARE NEW IN THIS DIFF?
  //
  // A token's consumers live in APP source, and the apps are submodules — so whether a
  // token is "used" depends on which gitlinks are checked out. My local run and CI
  // disagreed by one token for exactly that reason, and chasing parity would have meant
  // regenerating the baseline on every pointer advance.
  //
  // The doctrine was never "no token may be unreferenced". It is "a token MINTED and not
  // consumed" — --role-border-interactive was created and 173 files stayed on the old
  // border. So a token is fatal only when its DECLARATION IS NEW IN THIS DIFF.
  //
  // TWO dots, not three. `base...HEAD` diffs from the MERGE BASE, so once a branch merges
  // its base in — which every long-lived branch here does — everything the base added
  // since the fork reads as "added by this branch". That is how `--input`, a token this
  // branch never touched, was reported as newly minted and failed CI.
  const newTokenDecls = new Set()
  {
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/development'
    const diff = sh('git', ['diff', '--unified=0', base, 'HEAD', '--', 'packages/theme', 'packages/design-tokens'])
    for (const t of newDeclsFromDiff(diff)) newTokenDecls.add(t)
  }

  let failed = 0
  for (const kind of ['package', 'hook', 'token', 'persistence']) {
    const known = new Set(baseline[kind] ?? [])
    const now = new Set(findings[kind])
    for (const n of findings[kind]) {
      if (known.has(n)) { console.log(`  known   ${kind}: ${n} has no consumer`); continue }
      if (kind === 'token' && !newTokenDecls.has(n)) {
        console.log(`::warning::token '${n}' has no consumer and is not in the baseline. Not fatal: it was not declared in this diff, and token reach moves with the submodule pointers. Extend or trim the baseline with --write-baseline.`)
        continue
      }
      const minted = kind === 'token'
        ? ' It is declared in THIS diff — a token minted and not consumed is the exact pattern this gate exists for.'
        : ''
      console.error(`::error::NEW zero-consumer ${kind}: '${n}' exists and nothing uses it.${minted} Wire it, or remove it — there is no third state.`)
      failed++
    }
    for (const n of known) {
      if (!now.has(n)) {
        // Token reach moves with the submodule pointers, so a newly-USED token would
        // otherwise fail every pointer-advance PR for doing its job. Packages and hooks
        // live in this repo's own tree, so a stale entry there is real and stays fatal.
        if (kind === 'token') {
          console.log(`::warning::${BASELINE} still lists token '${n}', but it now has a consumer. Trim it with --write-baseline when convenient.`)
        } else {
          console.error(`::error::${BASELINE} still lists ${kind} '${n}', but it now HAS a consumer. Remove the entry — this list may only shrink.`)
          failed++
        }
      }
    }
  }

  if (failed) process.exit(1)
  console.log('✓ no new zero-consumer artifacts.')
}

if (import.meta.url === `file://${process.argv[1]}`) main()
