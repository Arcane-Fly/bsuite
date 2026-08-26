#!/usr/bin/env node
/**
 * WHICH SECURITY DEFINER FUNCTIONS ACTUALLY CHECK THEIR CALLER?
 *
 * A SECURITY DEFINER function runs with the definer's privileges, so RLS does
 * not apply to what it reads. Asking "which of them take a caller-supplied
 * identifier and never mention auth" is the right question and the wrong test:
 * measured against crm7 production on 2026-08-26 it returned **14 candidates,
 * of which 12 were guarded** — every one by a delegate a single call down.
 *
 *     data_grant_create              -> _data_grant_insert
 *     data_grant_row_permit          -> data_grant_widest, data_is_grant_restricted
 *     check_archive_recovery_needed  -> is_archive_recovery_authorized
 *     link_training_provider_...     -> its own explicit 42501, just not via auth.uid()
 *
 * That is roughly a 6:1 false-positive rate, and this estate has published
 * security findings off exactly that shape before. So the scan RESOLVES CALLEES
 * TRANSITIVELY: a candidate is only reported when neither it nor anything it
 * calls checks the caller.
 *
 * The two survivors on the day this was written were `get_sharing_level` and
 * `get_visible_fields` — genuinely unguarded, fixed in crm7#2048.
 *
 * IT REPORTS, IT DOES NOT RULE. A caller-supplied identifier on a DEFINER
 * function is a shape worth reading, not a finding. Two legitimate patterns
 * appear here and are labelled rather than hidden:
 *
 *   - TOKEN-GATED: the argument IS the authorisation (`p_token text`), used by
 *     the e-signature and public-application flows. Six of these exist; all six
 *     check expiry and hash the token. Deliberately reachable unauthenticated.
 *   - RLS HELPER: called from a policy USING clause, where INVOKER would be
 *     useless. Reported so a human can confirm, never auto-cleared.
 *
 * READS ROWS ON STDIN rather than opening a connection. `pg` is not installed
 * anywhere in this estate, so a script that imported it would SKIP on every
 * machine forever — a gate that can never run is worse than no gate, because it
 * prints a zero and looks like coverage. This way psql, the Supabase CLI or a
 * MCP query can all feed it, and the classifier is testable with no database at
 * all.
 *
 *   node scripts/audit-security-definer-guards.mjs --print-query   # the SQL
 *   psql "$POSTGRES_URL_NON_POOLING" -At -f <(node ... --print-query) \
 *     | node scripts/audit-security-definer-guards.mjs
 *   node scripts/audit-security-definer-guards.mjs --self-test
 *
 * With no stdin it exits 0 and SAYS SO — an absent result, never a clean one.
 */

/** Tokens that mean "this function established who the caller is". */
export const GUARD_TOKENS = [
  'auth.uid()', 'auth.jwt()', 'auth_tenant_id()', 'auth_user_id()',
  'auth_tenant_id_with_role', 'current_tenant_id()', 'acting_scope',
  'is_platform_admin', 'is_platform_developer', 'is_gto_admin', 'is_gto_staff',
  'has_capability',
]

/** The argument IS the credential — these are unauthenticated BY DESIGN. */
export const TOKEN_ARG = /\bp_token\b|\btoken\b/i

export function isSelfGuarded(def) {
  const d = String(def)
  return GUARD_TOKENS.some((t) => d.includes(t))
}

/**
 * Does `def` name any function in `guarded`? Word-boundary match, because a
 * substring hit on a longer name is how a scan silently clears itself.
 */
export function guardedCallees(def, guardedNames, selfName) {
  const d = String(def)
  return guardedNames.filter((n) => {
    if (n === selfName) return false
    return new RegExp(`(^|[^A-Za-z0-9_])${n}([^A-Za-z0-9_]|$)`).test(d)
  })
}

/**
 * Grow the guarded set to a FIXED POINT.
 *
 * One hop is not enough, and this was proven by the scan's own first live run:
 * `training_plan_belongs_to_current_apprentice` calls
 * `get_apprentice_person_id_for_current_user`, which calls
 * `person_ids_for_current_user`, which is where `auth.uid()` finally appears.
 * At one hop the middle function looks unguarded, so the outer one is reported
 * as a finding. It is not one.
 */
export function guardedClosure(fns) {
  const guarded = new Set(fns.filter((f) => isSelfGuarded(f.def)).map((f) => f.name))
  for (let pass = 0; pass < 12; pass++) {
    let grew = false
    for (const f of fns) {
      if (guarded.has(f.name)) continue
      if (guardedCallees(f.def, [...guarded], f.name).length) { guarded.add(f.name); grew = true }
    }
    if (!grew) break
  }
  return guarded
}

export function classify(fn, guarded, policyRefs = new Set()) {
  if (fn.annotated) return { verdict: 'ANNOTATED', why: 'carries @SD-JUSTIFICATION' }
  if (isSelfGuarded(fn.def)) return { verdict: 'GUARDED', why: 'checks the caller itself' }
  const via = guardedCallees(fn.def, [...guarded], fn.name)
  if (via.length) return { verdict: 'GUARDED-VIA', why: `reaches a caller check through ${via.slice(0, 3).join(', ')}` }
  // Checked BEFORE token-gating and before UNGUARDED: an RLS helper is required
  // to be DEFINER and required NOT to check its caller.
  if (policyRefs.has(fn.name)) return { verdict: 'RLS-HELPER', why: 'called from a policy expression — DEFINER is mandatory here' }
  if (TOKEN_ARG.test(fn.args)) return { verdict: 'TOKEN-GATED', why: 'the argument is the credential — confirm expiry and single-use by hand' }
  return { verdict: 'UNGUARDED', why: 'neither it nor anything it calls checks the caller' }
}

/** One JSON document, so a definition containing tabs or newlines cannot break
 *  the row split — which a column-delimited format would. */
export const SQL = `select json_build_object(
  'functions', coalesce((select json_agg(t) from (
     select p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args,
            pg_get_functiondef(p.oid) as def,
            p.prosecdef as secdef,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public') t), '[]'::json),
  -- Every policy expression, so a function CALLED FROM A POLICY can be told
  -- apart from one exposed to callers. An RLS helper MUST be DEFINER and MUST
  -- NOT check the caller; flagging it as unguarded is a false positive that
  -- invites someone to "fix" it and break the policy.
  'policy_exprs', coalesce((select json_agg(e) from (
     select coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' ||
            coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') as e
     from pg_policy pol) x), '[]'::json)
)::text;`

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: got === want, got, want })

  t('direct auth.uid() is guarded', isSelfGuarded('begin if auth.uid() is null then'), true)
  t('no guard token', isSelfGuarded('select 1 from tenants'), false)
  // The 12 near-misses are the whole reason this file exists.
  t('delegate is found',
    classify({ name: 'data_grant_create', args: 'p_tenant_id uuid', def: 'return public._data_grant_insert(p_tenant_id);' },
      ['_data_grant_insert']).verdict, 'GUARDED-VIA')
  t('a genuinely unguarded reader',
    classify({ name: 'get_sharing_level', args: 'p_source_tenant_id uuid', def: 'select sharing_level from tenant_sharing_policies;' },
      ['_data_grant_insert']).verdict, 'UNGUARDED')
  t('token-gated is not unguarded',
    classify({ name: 'redeem_x', args: 'p_token text', def: 'select 1 from tokens where token_hash = digest(p_token);' },
      []).verdict, 'TOKEN-GATED')
  t('annotated short-circuits',
    classify({ name: 'x', args: 'p_tenant_id uuid', def: 'x', annotated: true }, []).verdict, 'ANNOTATED')
  // NEGATIVE CONTROL: a substring must not clear a function. `is_gto` is not
  // `is_gto_admin`, and a bare `.includes()` would have said it was.
  t('substring does not count as a callee',
    guardedCallees('select foo_is_platform_adminx();', ['is_platform_admin'], 'x').length, 0)
  // NEGATIVE CONTROL: the scan must FIND something, or a pass proves nothing.
  t('an unguarded function is actually detected',
    classify({ name: 'y', args: 'p_user_id uuid', def: 'delete from t where id = p_user_id;' }, ['is_gto_admin']).verdict,
    'UNGUARDED')

  // The two-hop case that the first live run got WRONG, kept as a regression.
  const chain = [
    { name: 'person_ids_for_current_user', def: 'select ... auth.uid() ...' },
    { name: 'get_apprentice_person_id_for_current_user', def: 'select public.person_ids_for_current_user()' },
    { name: 'training_plan_belongs_to_current_apprentice', args: 'p_training_plan_id uuid',
      def: 'select public.get_apprentice_person_id_for_current_user()' },
  ]
  const closure = guardedClosure(chain)
  t('guard TWO hops away is reached', closure.has('training_plan_belongs_to_current_apprentice'), true)
  t('an RLS helper is not reported unguarded',
    classify({ name: 'ancestors_of', args: 'leaf_id uuid', def: 'select id from tenants' },
      new Set(), new Set(['ancestors_of'])).verdict, 'RLS-HELPER')
  // NEGATIVE CONTROL: closure must not swallow a genuinely unguarded function.
  t('closure does not over-clear',
    guardedClosure([{ name: 'lonely', def: 'select 1 from t' }]).has('lonely'), false)

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  console.log(`\naudit-security-definer-guards: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length === 0 ? 0 : 1
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())

  if (argv.includes('--print-query')) { console.log(SQL); process.exit(0) }

  const raw = await new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('')
    let buf = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (d) => { buf += d })
    process.stdin.on('end', () => resolve(buf))
  })
  if (!raw.trim()) {
    // STATE THE HOLE. Nothing examined is not the same as nothing found.
    console.log('audit-security-definer-guards: SKIPPED — no rows on stdin.')
    console.log('  Nothing was examined. This is an ABSENT result, not a clean one.')
    console.log('  Feed it:  psql "$POSTGRES_URL_NON_POOLING" -At -c \"$(node scripts/audit-security-definer-guards.mjs --print-query)\" | node scripts/audit-security-definer-guards.mjs')
    process.exit(0)
  }
  let doc
  try { doc = JSON.parse(raw) } catch {
    console.error('audit-security-definer-guards: stdin is not the JSON this expects. Use --print-query.')
    process.exit(2)
  }
  const rows = Array.isArray(doc) ? doc : doc.functions
  const policyExprs = (Array.isArray(doc) ? [] : doc.policy_exprs) || []
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('audit-security-definer-guards: the query returned ZERO functions — that is a broken query, not a clean schema.')
    process.exit(2)
  }

  const all = rows.map((r) => ({ ...r, annotated: /@SD-JUSTIFICATION/.test(r.def) }))
  const guarded = guardedClosure(all)
  const blob = policyExprs.join('\n')
  const policyRefs = new Set(all.filter((f) =>
    new RegExp(`(^|[^A-Za-z0-9_])${f.name}([^A-Za-z0-9_]|$)`).test(blob)).map((f) => f.name))
  const secdef = all.filter((f) => f.secdef && (f.authenticated || f.anon))

  const out = secdef.map((f) => ({ name: f.name, args: f.args, anon: f.anon, ...classify(f, guarded, policyRefs) }))
  const by = (v) => out.filter((o) => o.verdict === v)

  if (argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(by('UNGUARDED').length ? 1 : 0) }

  console.log(`audit-security-definer-guards: ${secdef.length} SECURITY DEFINER function(s) reachable by anon or authenticated`)
  console.log(`  ANNOTATED    ${by('ANNOTATED').length}`)
  console.log(`  GUARDED      ${by('GUARDED').length}   check the caller themselves`)
  console.log(`  GUARDED-VIA  ${by('GUARDED-VIA').length}   delegate to something that does — the 6:1 false-positive class`)
  console.log(`  RLS-HELPER   ${by('RLS-HELPER').length}   called from a policy — DEFINER is mandatory, do not "fix" these`)
  console.log(`  TOKEN-GATED  ${by('TOKEN-GATED').length}   the argument IS the credential; confirm expiry + single use by hand`)
  console.log(`  UNGUARDED    ${by('UNGUARDED').length}`)
  for (const o of by('TOKEN-GATED')) console.log(`    token   ${o.name}(${o.args.slice(0, 40)})${o.anon ? '  [anon]' : ''}`)
  for (const o of by('UNGUARDED')) console.log(`    \x1b[31mUNGUARDED\x1b[0m ${o.name}(${o.args.slice(0, 50)})${o.anon ? '  [anon]' : ''}`)
  process.exit(by('UNGUARDED').length ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
