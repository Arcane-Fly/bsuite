import { scanDiff } from '../check-added-security-definer.mjs'

const d = (lines) => lines.join('\n')
let failed = 0
const check = (name, diff, want) => {
  const got = scanDiff(diff).length
  if (got !== want) { console.error(`FAIL ${name}: want ${want}, got ${got}`); failed++ }
}

// caught
check('added SD function with no justification', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+CREATE FUNCTION public.f(p uuid) RETURNS void',
  '+ LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;',
]), 1)
check('CREATE OR REPLACE counts too', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+CREATE OR REPLACE FUNCTION public.g() RETURNS void SECURITY DEFINER AS $$ BEGIN END $$;',
]), 1)
check('two in one file are judged separately', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+CREATE FUNCTION public.a() SECURITY DEFINER AS $$ $$;',
  '+CREATE FUNCTION public.b() SECURITY DEFINER AS $$ $$;',
]), 2)

// NOT caught
check('justified is fine', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+CREATE FUNCTION public.f() RETURNS void',
  '+-- @SD-JUSTIFICATION: rls-helper called from a policy USING clause',
  '+ SECURITY DEFINER AS $$ BEGIN END $$;',
]), 0)
check('SECURITY INVOKER is not the subject', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+CREATE FUNCTION public.f() SECURITY INVOKER AS $$ $$;',
]), 0)
check('a plain function is not the subject', d([
  '--- a/m.sql', '+++ b/m.sql', '+CREATE FUNCTION public.f() AS $$ $$;',
]), 0)
check('REMOVED lines are not additions', d([
  '--- a/m.sql', '+++ b/m.sql',
  '-CREATE FUNCTION public.f() SECURITY DEFINER AS $$ $$;',
]), 0)
check('CONTEXT lines are not additions', d([
  '--- a/m.sql', '+++ b/m.sql',
  ' CREATE FUNCTION public.f() SECURITY DEFINER AS $$ $$;',
]), 0)
// The justified one must not shield an unjustified sibling in the same file.
check('one justified, one not -> one finding', d([
  '--- a/m.sql', '+++ b/m.sql',
  '+-- @SD-JUSTIFICATION: fine',
  '+CREATE FUNCTION public.ok() SECURITY DEFINER AS $$ $$;',
  '+CREATE FUNCTION public.bad() SECURITY DEFINER AS $$ $$;',
]), 1)

if (failed) { console.error(`\n${failed} self-test(s) FAILED`); process.exit(1) }
console.log('check-added-security-definer self-test: 9/9 passed (3 caught, 5 correctly ignored, 1 mixed-file case)')
