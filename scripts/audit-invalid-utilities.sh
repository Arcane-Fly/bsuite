#!/usr/bin/env bash
# G10 — utilities that Tailwind silently DROPS.
#
# The dangerous class: not a wrong colour, but no colour. Tailwind emits nothing
# for an unparseable utility, so the element renders with no background, no
# border, no opacity — and the source still *reads* correct. Nothing fails, no
# test breaks, and it survives review because the class name looks fine.
#
# THREE CONFIRMED CASES IN THIS REPO
#
# 1. DOUBLE OPACITY — `border-role-error/40/30`. Produced by a sweep that
#    appended its own /40 while the author's /30 stayed put. 92 sites.
#    Then 15 MORE in a second notation the first fix could not see:
#    `border-(--color-success)/50/50`. The first regex required [a-z-]+ after
#    the prefix, so the arbitrary-property form `(--color-x)` never matched.
#    Two notations, one defect, and only the second sweep found the second.
#    Hence: this gate matches the VALUE part as any of `(...)`, `[...]` or a
#    bare name, not just a bare name.
#
# 2. TAILWIND v3 OPACITY UTILITIES — `bg-opacity-50`, `text-opacity-*`,
#    `border-opacity-*`, `ring-opacity-*`. Removed in v4. `bg-black
#    bg-opacity-50` renders FULLY OPAQUE, so four R80.3 modals had a solid
#    black backdrop instead of a 50% scrim.
#
# 3. v3 FLEX UTILITIES — `flex-shrink-0` / `flex-grow` are `shrink-0` / `grow`
#    in v4. Layout silently loses the constraint.
#
# Usage: scripts/audit-invalid-utilities.sh [--list]
set -uo pipefail
cd "$(dirname "$0")/.."

APPS=(crm7 conduit business-suite-unified R80.3 throughput braden packages)
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
         --exclude-dir=.next --exclude-dir=.vercel --exclude-dir=.git
         --exclude-dir=.claude --exclude-dir=worktrees --exclude-dir=.superpowers
         --exclude-dir=public --exclude-dir=coverage --exclude-dir=__snapshots__)
INC=(--include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' --include='*.css')

PREFIX='(bg|text|border|ring|divide|from|via|to|shadow|fill|stroke|outline|decoration|accent|caret|placeholder)'
# The value may be a bare name, an arbitrary value [..], or an arbitrary
# property (--token). Missing the last two is how 15 sites survived a fix.
VALUE='(\([^)]*\)|\[[^]]*\]|[a-z0-9-]+)'

DOUBLE_OPACITY="${PREFIX}-${VALUE}/[0-9]+/[0-9]+"
V3_OPACITY='\b(bg|text|border|ring|divide|placeholder)-opacity-[0-9]+'
# Must be a CLASS, not the CSS property. `flex-shrink: 0` in a stylesheet is
# valid CSS and matched the first version of this pattern — a false positive in
# the gate itself. Anchored to a class-list delimiter.
V3_FLEX='["'"'"'` ]flex-(shrink|grow)(-[0-9]+)?["'"'"'` ]'

fail=0
check() { # $1=label $2=regex $3=hint
  local n out
  out=$(grep -rEn "$2" "${APPS[@]}" "${INC[@]}" "${EXCLUDE[@]}" 2>/dev/null \
        | grep -viE '__snapshots__|\.test\.|\.spec\.')
  n=$(printf '%s' "$out" | grep -c . || true)
  printf '  %-34s %s\n' "$1" "$n"
  if [[ $n -gt 0 ]]; then
    fail=1
    [[ ${1:-} ]] && :
    if [[ "${LIST:-}" == 1 ]]; then
      printf '%s\n' "$out" | sed 's/^/      /' | head -40
    fi
    HINTS+=("$3")
  fi
}

[[ ${1:-} == --list ]] && LIST=1
declare -a HINTS=()

echo
echo "Utilities Tailwind silently drops (renders as NOTHING, source looks fine):"
check 'double opacity  x/40/30'   "$DOUBLE_OPACITY" 'collapse to a single opacity — the product of the two'
check 'v3 opacity      bg-opacity-*' "$V3_OPACITY"  'removed in v4 — use bg-black/50 form; bg-opacity-50 renders FULLY OPAQUE'
check 'v3 flex         flex-shrink-0' "$V3_FLEX"    'v4 renames these to shrink-0 / grow'
echo

if [[ $fail -eq 1 ]]; then
  for h in "${HINTS[@]}"; do echo "  → $h"; done
  echo
  echo "Run with --list to see every site."
  exit 1
fi
echo "OK: no silently-dropped utilities."
