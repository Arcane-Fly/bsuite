#!/usr/bin/env bash
# A `-text` TOKEN MUST NOT CARRY AN OPACITY MODIFIER.
#
# WHY. The `--role-*-text` tokens exist because a saturated fill colour is not a
# legible text colour: each is tuned to clear WCAG AA 4.5:1. Writing
# `text-warning-text/80` composites it back toward the background and voids that
# tuning — and nothing in the estate measured it, because the contrast gate varies
# the BACKGROUND tint, not the foreground alpha.
#
# MEASURED on --role-bg-body, which is the most FAVOURABLE background (a tint is
# worse), 2026-08-28:
#
#     role        full   /90    /80    /70
#     primary     6.43   5.33   4.36   3.55
#     accent      5.61   4.63   3.82   3.16
#     success     6.11   4.98   4.06   3.32
#     warning     5.44   4.48   3.70   3.06
#     error       6.83   6.14   5.28   4.36
#     info        5.59   4.61   3.81   3.15
#     secondary   6.95   5.71   4.62   3.72
#
# /70 fails all seven roles. /80 fails five of seven. Even /90 fails warning. There
# is no alpha that is safe across the palette, which is why this is a ban and not a
# threshold: a per-site judgement would need the composite measured per background,
# and the whole point of a tuned token is that you do not have to.
#
# FOUND by running audit-legibility.mjs AUTHENTICATED. Unauthenticated it reported
# "0 findings, 41 skipped" — every real page redirects to login, so the zero meant
# blind. With a storage state: BSU /settings/organization [light], 3.56:1 on 14px
# warning text. 21 sites carried one across five repos, mostly on ERROR and WARNING
# copy.
#
# Honours `theme-audit-ok` on the matching line or the line above, as the other
# theme gates do.
set -uo pipefail
cd "$(dirname "$0")/.."

APPS=(crm7 conduit business-suite-unified R80.4 throughput braden packages)
INC=(--include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js')
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
         --exclude-dir=.next --exclude-dir=.vercel --exclude-dir=.git
         --exclude-dir=.claude --exclude-dir=worktrees --exclude-dir=coverage
         --exclude-dir=__snapshots__)

PATTERN='text-(primary|accent|success|warning|error|info|secondary)-text/[0-9]+'

hits=$(grep -rEn "$PATTERN" "${APPS[@]}" "${INC[@]}" "${EXCLUDE[@]}" 2>/dev/null \
       | grep -viE '\.test\.|\.spec\.' \
       | while IFS= read -r hit; do
           f=${hit%%:*}; rest=${hit#*:}; ln=${rest%%:*}
           case "$hit" in *theme-audit-ok*) continue;; esac
           if [ "$ln" -gt 1 ] 2>/dev/null &&
              sed -n "$((ln-1))p" "$f" 2>/dev/null | grep -q 'theme-audit-ok'; then
             continue
           fi
           printf '%s\n' "$hit"
         done)

n=$(printf '%s' "$hits" | grep -c . || true)

if [ "$n" -eq 0 ]; then
  echo "check-dimmed-text-tokens: OK — no -text token carries an opacity modifier."
  exit 0
fi

echo "check-dimmed-text-tokens: $n site(s) dim an AA-tuned text token." >&2
printf '%s\n' "$hits" | sed 's/^/  /' >&2
cat >&2 <<'MSG'

  Drop the modifier. The token is already tuned to clear 4.5:1; the alpha is what
  breaks it. If a piece of text genuinely must be quieter, use a token that is
  tuned to be quieter — do not dim one that is not.
MSG
exit 1
