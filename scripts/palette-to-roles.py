#!/usr/bin/env python3
"""Convert hardcoded Tailwind palette classes to @bsuite/theme role tokens.

WHY THIS MATTERS BEYOND TIDINESS
A palette-bound component is invisible to tenant white-labelling: BrandingProvider
mutates the role layer, and `bg-neutral-50` sits below it. Converting is what makes
the component themeable at all.

THE STRUCTURAL INSIGHT
Palette code writes both halves of every pair:
    border-neutral-200 dark:border-neutral-700
Role tokens already flip under `.dark`. So once the light class becomes a role
token, its `dark:` twin is ALWAYS redundant — there is no pair table to maintain,
because the rule is "convert light, drop the dark twin", not "match known pairs".

A first version of this script did try to enumerate pairs, missed
`bg-neutral-50`/`dark:bg-neutral-800`, converted the halves independently, and
emitted `bg-card ... bg-muted` in one className. Tailwind is last-wins, so that
renders bg-muted in BOTH modes — a silent visual regression from a "cleanup".
Hence the property-aware dedup below: if two different role tokens land on the
same CSS property, the one derived from the LIGHT class wins and the dark-derived
one is dropped.

Usage:  palette-to-roles.py [--dry] <file>...
"""
import re
import sys

# light palette class -> role token. `dark:` variants are handled generically.
MAP = {
    # surfaces
    'bg-white':          'bg-card',
    'bg-neutral-50':     'bg-card',
    'bg-neutral-100':    'bg-muted',
    'bg-neutral-200':    'bg-muted',
    'bg-neutral-700':    'bg-muted',
    'bg-neutral-800':    'bg-muted',
    'bg-neutral-900':    'bg-card',
    'bg-neutral-950':    'bg-background',
    # borders
    'border-neutral-100': 'border-border',
    'border-neutral-200': 'border-border',
    'border-neutral-300': 'border-border-strong',
    'border-neutral-600': 'border-border-strong',
    'border-neutral-700': 'border-border',
    'border-neutral-800': 'border-border',
    # text scale
    'text-neutral-100':  'text-foreground',
    'text-neutral-200':  'text-foreground',
    'text-neutral-300':  'text-text-secondary',
    'text-neutral-400':  'text-muted-foreground',
    'text-neutral-500':  'text-muted-foreground',
    'text-neutral-600':  'text-text-secondary',
    'text-neutral-700':  'text-text-secondary',
    'text-neutral-800':  'text-foreground',
    'text-neutral-900':  'text-foreground',
    'placeholder:text-neutral-400': 'placeholder:text-text-subtle',
    'placeholder:text-neutral-500': 'placeholder:text-text-subtle',
    # primary / selection
    'bg-blue-50':        'bg-role-primary/10',
    'bg-blue-600':       'bg-role-primary',
    'bg-blue-700':       'bg-role-primary',
    'bg-blue-950':       'bg-role-primary/10',
    'border-blue-200':   'border-role-primary/40',
    'border-blue-500':   'border-role-primary',
    'border-blue-900':   'border-role-primary/40',
    'text-blue-100':     'text-primary-text',
    'text-blue-400':     'text-primary-text',
    'text-blue-500':     'text-primary-text',
    'text-blue-600':     'text-primary-text',
    'text-blue-700':     'text-primary-text',
    'text-blue-900':     'text-primary-text',
    'ring-blue-500':     'ring-ring',
    # error — RED under the 0.7.0 separation-first contract
    'bg-red-50':         'bg-role-error/10',
    'bg-red-950':        'bg-role-error/10',
    'border-red-300':    'border-role-error/40',
    'border-red-500':    'border-role-error',
    'border-red-600':    'border-role-error',
    'border-red-700':    'border-role-error',
    'border-red-800':    'border-role-error/40',
    'text-red-300':      'text-error-text',
    'text-red-400':      'text-error-text',
    'text-red-500':      'text-error-text',
    'text-red-600':      'text-error-text',
    'text-red-700':      'text-error-text',
    'ring-red-500':      'ring-role-error',
    # warning
    'bg-amber-50':       'bg-role-warning/10',
    'border-amber-200':  'border-role-warning/40',
    'border-amber-300':  'border-role-warning/40',
    'border-amber-400':  'border-role-warning',
    'border-amber-700':  'border-role-warning',
    'border-amber-800':  'border-role-warning/40',
    'border-amber-900':  'border-role-warning/40',
    'text-amber-300':    'text-warning-text',
    'text-amber-600':    'text-warning-text',
    'text-amber-700':    'text-warning-text',
    'text-amber-800':    'text-warning-text',
    'ring-amber-500':    'ring-role-warning',
    # success / misc
    'text-emerald-600':  'text-success-text',
    'text-emerald-400':  'text-success-text',
    'text-purple-600':   'text-primary-text',
    'text-purple-500':   'text-primary-text',
    'text-emerald-500':  'text-success-text',
    # remaining values found by re-measuring after the first full pass rather than
    # assumed complete — the map is grounded in what the code actually uses
    'bg-red-500':        'bg-role-error',
    'bg-red-600':        'bg-role-error',
    'bg-red-700':        'bg-role-error',
    'bg-blue-500':       'bg-role-primary',
    'bg-amber-600':      'bg-role-warning',
    'bg-amber-700':      'bg-role-warning',
    'bg-amber-950':      'bg-role-warning/10',
    'text-blue-300':     'text-primary-text',
    'text-amber-100':    'text-warning-text',
    'text-amber-200':    'text-warning-text',
    'text-amber-500':    'text-warning-text',
    'text-amber-900':    'text-warning-text',
    'border-neutral-900': 'border-border',
    'divide-neutral-100': 'divide-border',
    'divide-neutral-800': 'divide-border',
    'border-white':      'border-card',
    'ring-offset-neutral-900': 'ring-offset-background',
}

# CSS property a utility drives, for conflict resolution.
def prop_of(cls: str) -> str:
    base = re.sub(r'^[a-z-]+:', '', cls)          # strip variant (hover:, focus:, …)
    base = base.split('/')[0]
    for p in ('bg-', 'text-', 'border-', 'ring-', 'divide-', 'fill-', 'stroke-'):
        if base.startswith(p):
            return p
    return base

# Allows className={`...`} and className={'...'} as well as the bare quoted form.
# The first version omitted the optional `{`, so every template-literal className —
# which is where all the conditional styling lives — went unconverted and the
# package still measured 60+ palette classes after a "complete" run.
CLASS_RE = re.compile(r'class(?:Name)?\s*=\s*\{?\s*(["\'`])(.*?)\1', re.S)


def convert_classlist(value: str) -> tuple[str, int]:
    toks = value.split()
    out, seen_prop, n = [], {}, 0
    for t in toks:
        # Tokens inside a ${...} interpolation carry the surrounding quote, and
        # some carry Tailwind's `!` important prefix. Strip both for the lookup and
        # restore them, or every conditional class stays palette-bound — which is
        # exactly where the conditional (error/selected) styling lives.
        lead = ''
        while t[:1] in ("'", '"', '`'):
            lead, t = lead + t[0], t[1:]
        trail = ''
        while t[-1:] in ("'", '"', '`', ',', ';'):
            trail, t = t[-1] + trail, t[:-1]
        bang = ''
        if t.startswith('!'):
            bang, t = '!', t[1:]
        if not t:
            out.append(lead + trail)
            continue
        variant, _, bare = t.rpartition(':')
        is_dark = variant == 'dark' or variant.endswith('dark')
        key = bare if not variant else f'{variant}:{bare}'
        # Opacity suffix (`bg-white/95`) is not part of the palette name. Strip it
        # for the lookup and re-apply, unless the role token carries its own.
        bare_base, slash, opacity = bare.partition('/')
        key_base = f'{variant}:{bare_base}' if variant else bare_base
        role = MAP.get(key) or MAP.get(bare) or MAP.get(key_base) or MAP.get(bare_base)
        if role is None:
            out.append(lead + bang + t + trail)
            continue
        if slash and '/' not in role:
            role = f'{role}/{opacity}'
        n += 1
        # A dark: variant becomes the plain role token — the token flips by itself.
        if is_dark:
            new = role
            derived_from_dark = True
        else:
            prefix = f'{variant}:' if variant else ''
            new = f'{prefix}{role}' if not role.startswith(f'{variant}:') else role
            derived_from_dark = False
        p = (variant if not is_dark else '', prop_of(new))
        if p in seen_prop:
            # Conflict on the same property. The LIGHT-derived token wins; a
            # dark-derived duplicate is the redundant twin and is dropped.
            idx, was_dark = seen_prop[p]
            if derived_from_dark:
                continue
            if was_dark:
                out[idx] = lead + bang + new + trail
                seen_prop[p] = (idx, False)
                continue
            if out[idx] == lead + bang + new + trail:
                continue
        new = lead + bang + new + trail
        seen_prop[p] = (len(out), derived_from_dark)
        out.append(new)
    return ' '.join(out), n


def convert(src: str) -> tuple[str, int]:
    """Convert class lists, never touching JavaScript.

    A template-literal className is NOT a class list — it is literal segments
    interleaved with `${...}` expressions containing arbitrary JS. An earlier
    version tokenised the whole thing on whitespace. Two things broke:

      · multi-line templates were collapsed onto one line, and
      · when a `dark:` twin carrying the CLOSING QUOTE of a ternary branch was
        dropped as redundant, the quote went with it —
        `'border-red-500 dark:border-red-600'` became `'border-role-error`
        and the file no longer parsed.

    `pnpm build` caught it: TS1005 ':' expected. So the fix is structural, not a
    patch — split on `${...}` and convert only the literal segments, and convert
    quoted string literals INSIDE an expression individually so conditional
    classes are still handled without the tokeniser ever seeing JS.
    """
    total = 0

    def do_list(text: str) -> str:
        """Convert a literal segment, PRESERVING its leading/trailing whitespace.

        The space before a `${` is significant: it separates the last static class
        from whatever the expression yields. Dropping it turns
        `focus:ring-ring ${cond ? 'a' : 'b'}` into `focus:ring-ringa`. TypeScript
        compiles that happily — it is a string — so the build gate cannot catch it.
        """
        nonlocal total
        lead = text[:len(text) - len(text.lstrip())]
        trail = text[len(text.rstrip()):]
        core = text.strip()
        if not core:
            return text
        new, n = convert_classlist(core)
        total += n
        return f'{lead}{new}{trail}'

    # A quoted class-list literal appearing inside a ${...} expression.
    STR = re.compile(r"(['\"])((?:[a-z0-9:!/\[\]._-]+\s+)*[a-z0-9:!/\[\]._-]+)\1", re.I)

    def do_expr(expr: str) -> str:
        return STR.sub(lambda m: f'{m.group(1)}{do_list(m.group(2))}{m.group(1)}', expr)

    def rep(m):
        quote, body = m.group(1), m.group(2)
        if quote != '`':
            return m.group(0).replace(body, do_list(body))
        out, i = [], 0
        for e in re.finditer(r'\$\{[^{}]*\}', body):
            out.append(do_list(body[i:e.start()]))
            out.append(do_expr(e.group(0)))
            i = e.end()
        out.append(do_list(body[i:]))
        return m.group(0).replace(body, ''.join(out))

    return CLASS_RE.sub(rep, src), total


def main() -> int:
    args = sys.argv[1:]
    dry = '--dry' in args
    files = [a for a in args if a != '--dry']
    total = 0
    for f in files:
        s = open(f).read()
        out, n = convert(s)
        total += n
        if n and not dry:
            open(f, 'w').write(out)
        if n:
            print(f'{n:5d}  {f}')
    print(f'{total:5d}  TOTAL{"  (dry run — nothing written)" if dry else ""}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
