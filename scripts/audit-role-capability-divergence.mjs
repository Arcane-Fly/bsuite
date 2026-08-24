#!/usr/bin/env node
/**
 * role_capabilities vs the hardcoded checks — measured, not asserted.
 *
 * WHY THIS EXISTS
 *
 * `public.role_capabilities` holds 1,296 rows across 3 tenants, 9 roles and 54
 * capabilities. 918 of them have been edited by hand and the most recent edit is
 * from today. It presents, in a customer-facing admin screen, a working
 * permissions model.
 *
 * It gates nothing. Not because nobody built a reader — one exists, is merged,
 * and is good (`user_has_capability()`, fail-closed, in crm7 migration
 * 20260905000000) — but because that migration has never been APPLIED. The
 * applier reads main's submodule gitlink, and main's crm7 pointer predates it.
 * So the resolver is absent from production and every measurement of this table
 * correctly reports "zero consumers".
 *
 * The moment that pointer advances, the resolver appears and this table starts
 * deciding things. THAT is the risk this script exists to size. Today the data
 * is inert; the day it stops being inert it must not be wrong.
 *
 * WHAT IT MEASURES
 *
 * For every cell where the two systems can actually be compared — a role name
 * they share, and a capability that maps to a permission crm7 checks — it asks
 * whether the table and the code agree, and classifies every disagreement as the
 * table over-granting or under-granting relative to today's enforced behaviour.
 *
 * The number that matters is ESCALATIONS: a write-shaped capability the table
 * grants and the code denies. Each one is a privilege the table would hand out
 * on the day it goes live.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not decide which side is right. A divergence is a question, not a
 * defect: either the table is wrong or the hardcoded check is. Deciding that
 * cell by cell is the reconciliation work this measurement exists to make
 * possible, and it is not a script's call.
 *
 * SELF-TESTS RUN FIRST, AND THAT IS LOAD-BEARING
 *
 * Every input here is parsed out of TypeScript with regular expressions. A regex
 * that silently stops matching yields an empty set, an empty set produces zero
 * divergences, and zero divergences reads exactly like success. An earlier
 * version of this parser dropped four roles — including `gto_staff`, one of the
 * four that can actually be compared — and would have reported 3 shared roles
 * instead of 4 with no indication anything was missing. So the parser proves it
 * can still see what it is looking for before it is allowed to report.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.env.BSUITE_ROOT ?? process.cwd()
const CRM7 = join(REPO, 'crm7', 'src')
const USE_PERMISSIONS = join(CRM7, 'hooks', 'usePermissions.ts')
const PERMISSION_CONSTANTS = join(CRM7, 'lib', 'permissionConstants.ts')

/* ── The mapping. Curated, and deliberately conservative. ──────────────────
 *
 * The two vocabularies share ZERO literal strings: the catalogue is dotted and
 * resource-scoped (`crm.contacts.read`), crm7 is snake_case and verb-first
 * (`view_contacts`). Every pair below is a human judgement that the two names
 * mean the same authorisation.
 *
 * Pairs are only listed where the meaning is unambiguous. `manage_compliance`
 * has no catalogue equivalent and is NOT guessed into one — an over-eager
 * mapping manufactures agreement, which is worse than an honest gap, because it
 * hides the fact that the catalogue does not cover crm7's surface.
 */
export const CAPABILITY_TO_PERMISSIONS = {
  'crm.contacts.read': ['view_contacts'],
  'crm.contacts.write': ['manage_contacts'],
  'crm.placements.read': ['view_placements'],
  'crm.placements.write': ['manage_placements', 'create_placement', 'edit_placement'],
  'conduit.pipeline.read': ['view_pipeline'],
  'conduit.pipeline.write': ['manage_pipeline'],
  'payroll.timesheets.read': ['view_timesheets'],
  'payroll.timesheets.write': ['manage_timesheets'],
  'payroll.timesheets.approve': ['approve_timesheets'],
  'payroll.charge_rates.read': ['view_charge_rates'],
  'platform.users.write': ['manage_users'],
  'reports.view': ['view_reports'],
  'training.assessments.write': ['manage_assessments'],
  'training.qualifications.write': ['manage_qualifications'],
}

/** Capabilities whose last segment grants the ability to change something. */
const WRITE_VERBS = new Set(['write', 'approve', 'delete', 'submit', 'create'])
const isWrite = (cap) => WRITE_VERBS.has(cap.split('.').pop())

/* ── Parsing crm7's hardcoded model ───────────────────────────────────────── */

function readSource(path) {
  if (!existsSync(path)) {
    // A missing submodule must be a HARD failure. A check that quietly passes
    // when it cannot see its inputs is indistinguishable from one that passed.
    throw new Error(
      `cannot read ${path} — crm7 submodule not checked out. ` +
        `Run with submodules initialised; refusing to report on inputs I cannot see.`,
    )
  }
  return readFileSync(path, 'utf8')
}

/** Every `NAME_PERMISSIONS = [...]` array, from both files. */
function permissionConstants(sources) {
  const consts = {}
  for (const src of sources) {
    const re =
      /([A-Z_]+_PERMISSIONS)\s*(?::\s*readonly\s+Permission\[\])?\s*=\s*\[([\s\S]*?)\]\s*as const|([A-Z_]+_PERMISSIONS)\s*:\s*readonly\s+Permission\[\]\s*=\s*\[([\s\S]*?)\n\]/g
    let m
    while ((m = re.exec(src))) {
      const name = m[1] ?? m[3]
      const body = m[2] ?? m[4] ?? ''
      const lits = [...body.matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1])
      if (lits.length) consts[name] = new Set([...(consts[name] ?? []), ...lits])
    }
  }
  return consts
}

/** Balanced-brace slice of the `rolePermissions` object literal. */
function roleBlock(src) {
  const start = src.indexOf('const rolePermissions')
  if (start < 0) throw new Error('rolePermissions object not found in usePermissions.ts')
  let i = src.indexOf('{', start)
  const begin = i
  let depth = 0
  for (;;) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) break
    i++
  }
  return src.slice(begin + 1, i)
}

export function parseRolePermissions(usePermissionsSrc, constants, allPermissions) {
  const body = roleBlock(usePermissionsSrc)
  const keys = [...body.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => [m.index, m[1]])
  const roles = {}
  keys.forEach(([pos, name], idx) => {
    const end = idx + 1 < keys.length ? keys[idx + 1][0] : body.length
    const seg = body.slice(pos, end)
    const set = new Set([...seg.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]))
    for (const [, spread] of seg.matchAll(/\.\.\.([A-Z_]+)/g)) {
      if (spread === 'ALL_PERMISSIONS') allPermissions.forEach((p) => set.add(p))
      else constants[spread]?.forEach((p) => set.add(p))
    }
    roles[name] = set
  })
  return roles
}

/* ── Live grants ──────────────────────────────────────────────────────────── */

async function fetchGrants() {
  /* CI has no service-role key — only SUPABASE_DB_PASSWORD and a project id, the
   * same pair every other live-DB gate here uses through the Supavisor pooler.
   * So CI queries with psql and hands the rows over as a file; a local run with
   * a service key can still use REST directly.
   *
   * Falling back to the ANON key was considered and rejected: RLS on
   * role_capabilities requires a member of the tenant, so anon reads zero rows,
   * and zero rows produces zero divergence — the precise false-clean the
   * self-tests exist to prevent. A gate that cannot see its input must fail. */
  const file = process.env.ROLE_CAPABILITIES_JSON
  if (file) {
    if (!existsSync(file)) throw new Error(`ROLE_CAPABILITIES_JSON=${file} does not exist`)
    const payload = JSON.parse(readFileSync(file, 'utf8'))
    const rows = payload.rows ?? payload
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `${file} contained no role_capabilities rows. The table is not empty; ` +
          'an empty read means the query or its credentials failed. Refusing to report zero.',
      )
    }
    const tenants = payload.tenants ?? Object.fromEntries(rows.map((r) => [r.tenant_id, r.tenant ?? r.tenant_id]))
    return { rows, tenants }
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Provide ROLE_CAPABILITIES_JSON (CI, via psql) or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local). ' +
        'Refusing to report a divergence of zero against a database I never reached.',
    )
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${url}/rest/v1/role_capabilities?select=role,capability,granted,tenant_id&limit=1000&offset=${offset}&order=id`,
      { headers },
    )
    if (!res.ok) throw new Error(`role_capabilities fetch failed: ${res.status}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < 1000) break
  }
  const tRes = await fetch(`${url}/rest/v1/tenants?select=id,name`, { headers })
  const tenants = Object.fromEntries((await tRes.json()).map((t) => [t.id, t.name]))
  return { rows, tenants }
}

/* ── The comparison ───────────────────────────────────────────────────────── */

export function compare(rows, tenants, rolePermissions) {
  const catalogueRoles = new Set(rows.map((r) => r.role))
  const shared = [...Object.keys(rolePermissions)].filter((r) => catalogueRoles.has(r)).sort()
  const cells = []
  for (const r of rows) {
    const perms = CAPABILITY_TO_PERMISSIONS[r.capability]
    if (!perms || !shared.includes(r.role)) continue
    const code = perms.some((p) => rolePermissions[r.role].has(p))
    cells.push({
      tenant: tenants[r.tenant_id] ?? r.tenant_id,
      role: r.role,
      capability: r.capability,
      code,
      table: r.granted,
    })
  }
  const over = cells.filter((c) => c.table && !c.code)
  const under = cells.filter((c) => c.code && !c.table)
  return {
    shared,
    catalogueOnly: [...catalogueRoles].filter((r) => !rolePermissions[r]).sort(),
    crm7Only: Object.keys(rolePermissions).filter((r) => !catalogueRoles.has(r)).sort(),
    cells,
    over,
    under,
    escalations: over.filter((c) => isWrite(c.capability)),
  }
}

/* ── Self-tests. These run before anything is reported. ───────────────────── */

function selfTest(rolePermissions, allPermissions) {
  const fail = (m) => {
    console.error(`SELF-TEST FAILED: ${m}`)
    process.exit(2)
  }
  // 1. The parser must find roles at all.
  if (Object.keys(rolePermissions).length < 10)
    fail(`parsed only ${Object.keys(rolePermissions).length} roles; expected the full set`)
  // 2. No role may be empty. `field_officer` is defined purely by a spread and
  //    was silently empty until spreads were resolved — the exact shape of
  //    failure this test exists for.
  const empty = Object.entries(rolePermissions)
    .filter(([, v]) => v.size === 0)
    .map(([k]) => k)
  if (empty.length) fail(`roles parsed as empty (unresolved spread?): ${empty.join(', ')}`)
  // 3. `...ALL_PERMISSIONS` must actually expand.
  if ((rolePermissions.gto_admin?.size ?? 0) !== allPermissions.length)
    fail('gto_admin uses ...ALL_PERMISSIONS but did not expand to the full set')
  // 4. A known-good pair must resolve, or the mapping keys have drifted.
  if (!rolePermissions.viewer?.has('view_dashboard'))
    fail('viewer lost view_dashboard; role parsing has drifted')
  // 5. Every permission named in the mapping must exist in crm7, or the mapping
  //    is stale and would silently compare against nothing.
  const all = new Set(allPermissions)
  const ghosts = Object.values(CAPABILITY_TO_PERMISSIONS)
    .flat()
    .filter((p) => !all.has(p))
  if (ghosts.length) fail(`mapping names permissions crm7 does not define: ${ghosts.join(', ')}`)
  console.log(`self-tests passed (${Object.keys(rolePermissions).length} roles, ${allPermissions.length} permissions)`)
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  const useSrc = readSource(USE_PERMISSIONS)
  const constSrc = readSource(PERMISSION_CONSTANTS)
  const constants = permissionConstants([constSrc, useSrc])
  const allPermissions = [...new Set(Object.values(constants).flatMap((s) => [...s]))].sort()
  const rolePermissions = parseRolePermissions(useSrc, constants, allPermissions)

  selfTest(rolePermissions, allPermissions)

  const { rows, tenants } = await fetchGrants()
  const r = compare(rows, tenants, rolePermissions)

  const pct = (n) => Math.round((100 * n) / r.cells.length)
  console.log(`
role_capabilities rows            ${rows.length}
crm7 permissions                  ${allPermissions.length}
catalogue capabilities            ${new Set(rows.map((x) => x.capability)).size}
literal string overlap            ${allPermissions.filter((p) => rows.some((x) => x.capability === p)).length}
mapped capabilities               ${Object.keys(CAPABILITY_TO_PERMISSIONS).length}

roles: crm7 ${Object.keys(rolePermissions).length} | catalogue ${r.shared.length + r.catalogueOnly.length} | SHARED ${r.shared.length}
  shared         ${r.shared.join(', ')}
  catalogue-only ${r.catalogueOnly.join(', ')}
  crm7-only      ${r.crm7Only.join(', ')}

COMPARABLE CELLS                  ${r.cells.length}
  agree                           ${r.cells.length - r.over.length - r.under.length} (${pct(r.cells.length - r.over.length - r.under.length)}%)
  table OVER-grants               ${r.over.length}
  table UNDER-grants              ${r.under.length}
  DIVERGENCE                      ${r.over.length + r.under.length} (${pct(r.over.length + r.under.length)}%)

PRIVILEGE ESCALATIONS             ${r.escalations.length}
  (a write the table grants and the code denies — each one goes live
   the day crm7 migration 20260905000000 is applied)`)

  for (const c of r.escalations.sort((a, b) => `${a.tenant}${a.role}${a.capability}`.localeCompare(`${b.tenant}${b.role}${b.capability}`)))
    console.log(`    ${c.tenant.padEnd(22)}${c.role.padEnd(12)}${c.capability}`)

  const baselinePath = join(REPO, 'scripts', 'role-capability-divergence-baseline.json')
  if (existsSync(baselinePath)) {
    const base = JSON.parse(readFileSync(baselinePath, 'utf8'))
    console.log(`\nbaseline escalations ${base.escalations} -> current ${r.escalations.length}`)
    if (r.escalations.length > base.escalations) {
      console.error(
        `::error::privilege escalations rose from ${base.escalations} to ${r.escalations.length}.`,
      )
      process.exit(1)
    }
    if (r.escalations.length < base.escalations) {
      console.error(
        `::error::escalations FELL from ${base.escalations} to ${r.escalations.length} — bank it by updating the baseline. A ratchet that is not re-banked stops ratcheting.`,
      )
      process.exit(1)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(`::error::${e.message}`)
    process.exit(2)
  })
}
