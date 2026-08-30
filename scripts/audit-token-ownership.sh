#!/usr/bin/env bash
# G4 — no app may redeclare a token the package owns.
#
# Operator ruling 2026-08-03: "I'm not liking per app overrides. it undermines
# the whole point of the package."
#
# THE FAILURE THIS CATCHES
# An app that redeclares --color-card, --font-sans or --role-primary locally is
# not "customising" — it is forking the design system. The fork then drifts,
# silently, because nothing compares the two. Measured cases from this session:
#
#   · conduit redeclared 86 package tokens, including a blue-tinted background
#     found nowhere else and --color-primary as GREEN while the suite ran blue.
#   · Every app declared its own --font-sans, so the estate ran system-ui,
#     Inter and JetBrains Mono simultaneously against a contract naming one
#     family.
#   · 286 headings carried an explicit text-foreground that overrode the
#     heading ramp back to flat body colour.
#
# None of those were visible to a colour scanner: every value was individually
# legal. What was wrong was WHO DECLARED IT.
#
# WHAT IS STILL ALLOWED
#   · A token the package does not define (an app-specific concept).
#   · The [data-app] accent mechanism — that lives IN the package, and is how
#     an app is supposed to differ.
#   · A declaration carrying `theme-own-ok: <reason>` on the line or the one
#     above, for a genuine app-level concept that happens to share a name.
#
# Usage: scripts/audit-token-ownership.sh [--list]
set -uo pipefail
cd "$(dirname "$0")/.."

APPS=(crm7 conduit business-suite-unified R80.4 throughput braden)
MARKER='theme-own-ok'
# Gate F: a worktree is a full second copy of the tree; counting one makes every
# number wrong. .vercel holds the compiled bundle.
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
         --exclude-dir=.next --exclude-dir=.vercel --exclude-dir=.git
         --exclude-dir=.claude --exclude-dir=worktrees --exclude-dir=.superpowers
         --exclude-dir=public --exclude-dir=coverage)

# The authority set is BRAND-SPECIFIC. vars.css (D2C) and braden.css
# (Corporate) are never loaded together, so a D2C app redeclaring a token that
# only exists in braden.css is not a conflict — nothing would have provided it.
# Treating both files as one set reported conduit's --radius-sm as a
# redeclaration when the D2C theme does not define --radius-sm at all.
pkg_tokens() { # $1 = brand file
  grep -ohE '^\s*--[a-z0-9-]+\s*:' "$1" packages/theme/src/preset-v4.css 2>/dev/null \
    | tr -d ' :' | sort -u
}

D2C=$(pkg_tokens packages/theme/src/css/vars.css)
CORP=$(pkg_tokens packages/theme/src/css/braden.css)
[[ -z $D2C ]] && { echo "could not read package tokens" >&2; exit 2; }

total=0
scoped=''
declare -A per_app

for a in "${APPS[@]}"; do
  [[ -d $a ]] || continue
  # braden is Corporate; everything else is D2C.
  if [[ $a == braden ]]; then PKG="$CORP"; else PKG="$D2C"; fi
  hits=""
  while IFS= read -r f; do
    # Skip a declaration whose line, or the line above, carries the marker.
    while IFS= read -r line; do
      n=${line%%:*}; rest=${line#*:}
      tok=$(printf '%s' "$rest" | grep -ohE -- '--[a-z0-9-]+\s*:' | head -1 | tr -d ' :')
      [[ -z $tok ]] && continue
      # `--` before the pattern is load-bearing: a token starts with "--", so
      # without it grep reads the token as an option, errors, and the caller
      # counts ZERO — a false pass. This gate produced exactly that on its
      # first run, which is the failure mode it exists to catch.
      grep -qxF -- "$tok" <<<"$PKG" || continue
      # Scan the WHOLE preceding comment block, not one line. A reason worth
      # writing is usually several lines long, which puts the marker at the top
      # of the comment and the value well below it — so a one-line lookback
      # misses every properly-explained exception and only catches terse ones.
      # That is backwards: the better the justification, the less likely it was
      # to be seen. 12 lines covers a real paragraph.
      ctx=$(sed -n "$((n>12?n-12:1)),${n}p" "$f" 2>/dev/null)
      grep -q "$MARKER" <<<"$ctx" && continue

      # WHERE it is declared decides whether it is a fork or an adaptation.
      #
      # The ruling this gate enforces is about an app REPLACING the package's
      # value everywhere ("it undermines the whole point of the package"). That
      # is a declaration at the root — :root, html, body, #root, .dark, * — where
      # it shadows the package for the entire document and the package's value
      # never applies again.
      #
      # A declaration inside a narrower selector is the opposite: it uses the
      # package's own token to adapt one surface, which is the mechanism working
      # as designed. The theme ships exactly this shape itself as
      # [data-surface='dark']. Counting those as forks pushes every legitimate
      # adaptation toward a theme-own-ok marker, and a gate whose markers are
      # routine is weaker than one with a predicate that is actually right.
      #
      # So: root-scope still fails. Narrower scope is reported separately, never
      # silently — an app CAN still fork by scoping to something broad, and that
      # stays visible in the SCOPED list rather than disappearing.
      sel=$(awk -v n="$n" 'NR<n && /\{/ { line=$0 } END { print line }' "$f" 2>/dev/null)
      # `@theme` IS root scope, and missing that made this gate blind.
      #
      # Tailwind v4's @theme block is not a narrow selector — it is THE place a
      # design system defines its tokens, and Tailwind emits every one of them
      # to :root. An app declaring a package-owned token there shadows the
      # package for the whole document exactly as `:root` does.
      #
      # Measured 2026-08-30: conduit declares --radius-sm/md/lg/xl in
      # `@theme {` at globals.css:135-138. It reported as 0 redeclarations AND
      # did not appear in the SCOPED list either, so four forks were invisible
      # in both directions while crm7 and BSU were correctly failed for the
      # identical declaration written in `:root`. Same fork, different syntax,
      # opposite verdict.
      if grep -qE '(^|[,[:space:]])(:root|html|body|\*|#root|\.dark)([,[:space:]{]|$)' <<<"$sel" \
         || grep -qE '^\s*@theme\b' <<<"$sel"; then
        hits+="  $f:$n  $tok"$'\n'
      else
        scoped+="  $a  $f:$n  $tok   in: $(printf '%s' "$sel" | tr -s ' ' | cut -c1-48)"$'\n'
      fi
    done < <(grep -nE '^\s*--[a-z0-9-]+\s*:' "$f" 2>/dev/null)
  done < <(grep -rlE '^\s*--[a-z0-9-]+\s*:' "$a" --include='*.css' "${EXCLUDE[@]}" 2>/dev/null)

  n=$(printf '%s' "$hits" | grep -c . || true)
  per_app[$a]=$n
  total=$((total + n))
  if [[ ${1:-} == --list && $n -gt 0 ]]; then
    printf '\n=== %s (%s) ===\n%s' "$a" "$n" "$hits"
  fi
done

echo
printf '%-26s %s\n' 'APP' 'package-owned tokens redeclared'
printf '%s\n' "$(printf '%.0s─' {1..60})"
for a in "${APPS[@]}"; do
  [[ -d $a ]] || continue
  printf '%-26s %s\n' "$a" "${per_app[$a]:-0}"
done
echo
echo "TOTAL: $total   (D2C theme declares $(wc -l <<<"$D2C"); Corporate $(wc -l <<<"$CORP"))"
echo
if [[ $total -gt 0 ]]; then
  echo "An app redeclaring a package token has forked the design system."
  echo "Fix by DELETING the local declaration so the package's value applies."
  echo "If the app genuinely owns the concept, rename it or annotate the line"
  echo "with 'theme-own-ok: <reason>'. Run with --list to see every site."
  exit 1
fi
if [[ -n $scoped ]]; then
  echo "SCOPED re-points (not failures — the token is adapted for one surface,"
  echo "not replaced document-wide). Listed so they stay visible:"
  printf '%s' "$scoped"
  echo
fi
echo "OK: no app redeclares a package-owned token at root scope."
