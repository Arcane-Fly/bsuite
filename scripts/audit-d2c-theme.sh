#!/usr/bin/env bash
# D2C Neon Electric theme-compliance scanner.
#
# Doctrine: AGENTS.md tripwire #10 + packages/theme/README.md.
# Operator ruling 2026-08-02: pure white/black banned FULL STOP (any role, not just text).
#
# Scope:  the five D2C apps + shared packages + braden.
#
# braden is the Corporate brand and is exempt from the D2C *palette* (red/gold/navy is its
# identity, and red-as-corporate-primary is allowed). It is NOT exempt from the pure
# white/black ban — operator confirmed 2026-08-02 that the ban is platform-wide, and the
# Corporate baseline needs the same anti-glare text scale as D2C.
# Exempt from everything: build output, lockfiles.
#
# Usage: scripts/audit-d2c-theme.sh [--files CLASS]   # --files prints matching paths
set -uo pipefail
cd "$(dirname "$0")/.."

APPS=(crm7 conduit business-suite-unified R80.4 throughput packages braden)
SRC_EXT=(--include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx'
         --include='*.css' --include='*.scss' --include='*.html' --include='*.vue')
# .vercel/ is the one that matters most: `.vercel/output/static/assets/` holds the
# compiled bundle (monaco-editor, xyflow, the whole CSS build) and on its own
# contributed ~1175 phantom "hex colour" matches to crm7's first count. Build output
# is not authored source and must never reach a compliance number.
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
         --exclude-dir=.next --exclude-dir=out --exclude-dir=coverage
         --exclude-dir=.turbo --exclude-dir=storybook-static --exclude-dir=.git
         --exclude-dir=.vercel --exclude-dir=.output --exclude-dir=.cache
         --exclude-dir=.svelte-kit --exclude-dir=public
         # Agent worktrees hold full copies of the tree. crm7/.claude/worktrees
         # alone held 1.3GB across three stale checkouts, and counting them made
         # crm7's C1 read 290 immediately after a change that only REMOVED pure
         # endpoints. Any count that includes a worktree is counting the past.
         --exclude-dir=.claude --exclude-dir=worktrees --exclude-dir=.superpowers
         --exclude-dir=playwright-report --exclude-dir=test-results
         # .lighthouseci holds Lighthouse's own generated report bundle — an
         # `lhr-*.html` per run with the whole audited page inlined, plus its
         # JSON twin. It is build output in exactly the sense .vercel/output is,
         # and it was the ONLY generated directory this list missed.
         #
         # Measured, on the operator's working checkout with two apps' reports
         # present (46 files in business-suite-unified alone):
         #
         #             C1 real          C2 real
         #   BSU        1345 -> 1        1369 -> 40
         #   crm7         65 -> 1          69 -> 6
         #
         # That is not a rounding error, it is a different verdict. The gate
         # itself never saw it — CI checks out fresh and .lighthouseci is
         # untracked, so the number in this repository was right and the number
         # a human got from running the documented command was off by 1300.
         #
         # Which makes it worse than a wrong count, because the ratchet's whole
         # contract is "run scripts/audit-d2c-theme.sh, put the number in the
         # baseline file". Anyone who did that from a working copy with
         # Lighthouse output in it banked a ceiling 1300 above the real one, and
         # the gate would then have waved through every pure endpoint anyone
         # added until someone re-derived it on a clean tree.
         --exclude-dir=.lighthouseci
         --exclude-dir=__snapshots__ --exclude=*.min.css --exclude=*.min.js
         --exclude=*.d.ts --exclude=*.map
         # A lint rule that FORBIDS `text-white` must contain the string
         # `text-white`. Counting eslint-rules/ as violations charged 34 phantom
         # hits across four apps against exactly the code enforcing the rule.
         --exclude-dir=eslint-rules)

# Paths where a literal colour is legitimate and must be reported separately, not as
# a defect: email HTML (clients support neither CSS vars nor oklch), PDF/canvas/chart
# renderers (need concrete values), branding pickers/tests (hex IS the subject matter),
# and PWA/manifest theme-color metadata.
# PRINT ARTEFACTS. A PDF page is paper, not a themed screen surface — the
# anti-glare rationale for banning pure white does not apply to something that
# gets printed, and pdf-lib/react-pdf need concrete values because CSS variables
# do not exist in a PDF. `render[A-Za-z]*Pdf` already covered most of these, but
# it MISSED renderF17 and renderNsgtoStandard2Pack, which are the same kind of
# file with a different name — so identical code counted as a defect in one and
# was exempt in the other. Matched on the pdfOklch()/rgb() call sites' files
# explicitly rather than widening the pattern into something that would swallow
# unrelated `render*` components.
#
# shine-border and border-beam are deliberately NOT listed. Their `#fff`/`#000`
# are mask stops, where the channel is opacity rather than paint; that is
# documented at each call site. Excluding those files by name would also hide a
# real colour if one were added to them later.
# packages/eslint-config/rules/ is THE SOURCE OF THE COLOUR RULE ITSELF, and it is
# here for exactly the reason `--exclude-dir=eslint-rules` exists above: a rule that
# forbids pure white must name pure white, in its error message and in the comments
# explaining which forms it once missed.
#
# The exclusion above was written for the INLINE COPIES, whose directory is called
# `eslint-rules`. The original they are generated from lives in a directory called
# `rules`, so it was never covered — the guard was right and its SCOPE was the bug,
# which is the same defect this estate has now found in three separate places this
# week. It stayed invisible only because the old rule named few literals; rewriting
# the detection as a tokeniser (bsuite#1889) documented the two holes it had been
# missing, and the count jumped 7 -> 17 against a baseline of 11.
#
# Listed here rather than in the grep excludes deliberately: EXCEPTION_RE moves a
# path into the EXEMPT column, where it stays visible and countable. An
# `--exclude-dir` would make it disappear, and a colour that is genuinely wrong in
# the rule's own message should still be readable by someone auditing this.
# ── THE EXCEPTION IS TWO DIFFERENT CLAIMS, AND THEY ARE NOT INTERCHANGEABLE ───
#
# This was ONE regex until 2026-08-13 (bsuite#1962), applied identically to all
# four classes. That conflated "this file legitimately NAMES a colour" with
# "this file legitimately needs a non-oklch FORMAT", and the second claim was
# silently granting the first.
#
# What it cost, measured: 17 pure whites sat in crm7's PDF renderers —
# ChargeRatePdfDocument.tsx among them, the document the quote signing page
# renders for a client to sign. EVERY ONE of those seven files matched a path
# pattern below (`PdfDocument`, `render[A-Za-z]*Pdf`, `renderF17`,
# `renderNsgtoStandard2Pack`, `guardian-consents`), so all 17 were counted in the
# EXEMPT column. crm7's C1 row read `1 / 32` before the fix and `1 / 15` after:
# seventeen pure whites left the codebase and THE REAL COLUMN NEVER MOVED. A
# scanner whose headline number cannot change when the defect it exists to find
# is removed is not measuring that defect.
#
# The split mirrors the ESLint rule's own doctrine exactly — the carve-outs
# license a FORMAT, never a VALUE:
#
#   NAMING   the file's job is to contain the literal as DATA: the colour rule's
#            own error message, tests asserting the ban, converters and pickers
#            whose input IS a colour, and a selector that matches white in order
#            to remove it. Exempt from every class, C1 included.
#
#   FORMAT   the engine cannot take a token, so hex/rgb is the only thing that
#            renders: PDF, email HTML, manifests, index.html. Exempt from the
#            FORMAT classes only. Pure white and pure black are still REAL here,
#            because no engine ever required them — that is the whole point.
#
# What the split found immediately, both previously filed as EXEMPT: a pure-white
# spinner in crm7/index.html's error-recovery screen, and pure black on the title
# of conduit's e-signature Certificate of Completion (crm7 had already fixed the
# identical line in its own certificate).
#
# It also moved two COMMENT-PROSE hits into C1-real in business-suite-unified —
# `send-team-invite` and `assign-tester-license` each carry a comment saying the
# pure value "used to" be there. This scanner is a grep and cannot tell prose from
# code; that is a known limit, and re-listing those two files by name is exactly
# the path-shaped exemption this block exists to stop. Triage them, do not exempt
# them. The ESLint rule is the instrument that reads syntax.
NAMING_EXCEPTION_RE='(packages/eslint-config/rules/|__tests__|\.test\.|\.spec\.|Branding|branding|OklchColorPicker|color-convert|/charts?/|chart\.tsx)'
FORMAT_EXCEPTION_RE='(supabase/functions/|/email|Email|render[A-Za-z]*Pdf|renderF17|renderNsgtoStandard2Pack|PdfDocument|documentSigner|guardian-consents|manifest|vite\.config|index\.html)'
# Everything the old single regex covered, for the classes where format latitude
# is the actual justification.
EXCEPTION_RE="(${NAMING_EXCEPTION_RE}|${FORMAT_EXCEPTION_RE})"

# ── Violation-class predicates ────────────────────────────────────────────────
# C1 pure white/black — Tailwind utilities. All colour-bearing prefixes, with optional
#    variant chain (dark:, hover:, group-hover:, md:, …) and optional /opacity suffix.
PREFIX='(text|bg|border|divide|ring|ring-offset|outline|fill|stroke|shadow|decoration|accent|caret|placeholder|from|via|to)'
C1_TW="(^|[\"' \`])([a-z-]+:)*${PREFIX}-(white|black)(\/[0-9]+)?([\"' \`]|$)"

# C1b pure white/black — literal values in CSS / inline styles / arbitrary classes.
#
# The BARE-HSL-TRIPLET alternative at the end is not decoration. shadcn stores
# its colours as unwrapped triplets (`--card: 0 0% 100%`) that only become a
# colour when a consumer wraps them: `hsl(var(--card))`. There is no `hsl(` on
# the declaration line, so every pattern above walks straight past it — and it
# hid FIVE pure-white declarations that were live in production: braden's
# --background, --popover and --card (the literal pure-white card this whole
# effort exists to remove), plus --sidebar-primary-foreground in BSU and in
# @bsuite/nav-core's shipped token file. Nothing caught them for the entire
# audit because everyone, including this scanner, was looking for `#fff`.
C1_LIT='#([fF]{3}|[fF]{6}|[fF]{8}|0{3}|0{6})\b|rgba?\(\s*255\s*,?\s*255\s*,?\s*255|rgba?\(\s*0\s*,?\s*0\s*,?\s*0[\s,)]|oklch\(\s*1(\.0+)?\s+0\s+0|oklch\(\s*0\s+0\s+0|:\s*(white|black)\s*[;,)]|--[a-z-]+:\s*0\s+0%\s+(100|0)%'

# C2 non-OKLCH colour formats in authored source.
#
# The hex predicate MUST require a colour context. A bare /#[0-9a-fA-F]{3}\b/ matches
# GitHub issue references — `crm7#217`, `bsuite#714`, `(#559)` are all valid 3-char hex —
# and those dominate this codebase's comments. The first run of this scanner reported
# 1725 "hex colours" in crm7; sampling showed the overwhelming majority were issue refs.
# Colour context = a quoted standalone hex, a CSS declaration value, or a Tailwind
# arbitrary value. Issue refs match none of the three.
#
# The fourth alternative closes a real hole found 2026-08-17 (TH-1 finish pass):
# `-\[#...\]` only matches a hex sitting immediately after the opening bracket.
# braden/conduit/business-suite-unified's shared `meteors.tsx` carried
# `shadow-[0_0_0_1px_#f2f2f210]` — the hex is mid-bracket, preceded by another
# Tailwind arbitrary-value segment (`1px`) joined with the `_` (space) separator
# — and every C2_HEX alternative walked past it. Positive-controlled: the OLD
# regex returns zero matches against that exact string; the NEW alternative
# below returns one, and it does not match GitHub issue refs (`crm7#217`) because
# those never have an underscore directly before the `#`. crm7's own copy of the
# same component had already been converted to oklch — this hole is why the
# scanner never caught its three siblings.
C2_HEX='["'"'"'`]#[0-9a-fA-F]{3,8}["'"'"'`]|:\s*#[0-9a-fA-F]{3,8}\b|-\[#[0-9a-fA-F]{3,8}\]|_#[0-9a-fA-F]{3,8}(_|\])'
C2_RGB='\brgba?\(\s*[0-9]'
C2_HSL='\bhsla?\(\s*[0-9.]'

# C3 token bypasses — hardcoded Tailwind palette + arbitrary-value colour classes.
PALETTE='(slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
C3_PALETTE="(^|[\"' \`])([a-z-]+:)*${PREFIX}-${PALETTE}-[0-9]{2,3}(\/[0-9]+)?"
# An arbitrary value wrapping var(--token) is a TOKEN REFERENCE, not a
# bypass — `bg-[hsl(var(--sidebar-background))]` is the correct way to reach
# a token that has no utility bridged for it. Only a LITERAL inside the
# brackets is a bypass, so the value must not begin with var(.
C3_ARBITRARY="${PREFIX}-\[(#|rgb\(|hsl\(\s*[0-9.]|oklch\(\s*[0-9.])"

# C4 destructive/error rendered red or coral instead of Electric Purple.
# The `(?<!\w)` equivalent — a hex preceded by a word char is an issue
# reference (`crm7#1297`, `R80.4#326`), not a colour, and this repo's comments
# are dense with them. Two of the four C4 hits were issue numbers.
C4="(destructive|error|danger)[^\n]{0,80}(${PALETTE}-[0-9]|[^0-9a-zA-Z]#[0-9a-fA-F]{6}\b|oklch\(0\.6[0-9]+ 0\.2[0-9]+ 2[0-9]\.)|--destructive[^\n]{0,60}oklch\(0\.[0-9]+ 0\.[0-9]+ (1[5-9]|2[0-9])\."

# An inline opt-out for a value that is deliberately a pure endpoint.
#
# WHY THIS EXISTS. A handful of pure endpoints are CORRECT and must never be
# swept: `prefers-contrast: high` blocks, `#fff`/`#000` inside mask- gradients
# (where the channel is opacity, not paint), and the contrast picker's
# measurement swatches. Before this marker they were indistinguishable from
# defects, which left a permanent floor of ~41 — and a gate that can never
# reach zero is a gate nobody can enforce. Now the residual is genuinely 0 and
# any NEW pure endpoint stands out immediately.
#
# Usage: put `theme-audit-ok: <reason>` in a comment on the same line, OR on
# the line immediately above — the eslint-disable-next-line convention. The
# preceding-line form is REQUIRED for values inside a className string or other
# string literal, which cannot carry a trailing comment of their own; that is
# exactly the shape border-beam's mask- utility has.
# It is deliberately noisy to type, and the reason is not optional.
AUDIT_OK='theme-audit-ok'

# Emit "path:match" pairs, skipping lines annotated with the marker.
# Done per-file rather than with a single `grep -ro` because the marker is a
# LINE-level fact and `grep -o` has already discarded the line by the time we
# could test it.
emit() { # $1=regex  $2=path
  local f
  while IFS= read -r f; do
    awk -v ok="$AUDIT_OK" '{ if (index($0,ok) || index(prev,ok)) { prev=$0; next } print; prev=$0 }' "$f" \
      | grep -oE "$1" | sed "s|^|$f:|"
  done < <(grep -rEIl "$1" "$2" "${SRC_EXT[@]}" "${EXCLUDE[@]}" 2>/dev/null)
}

scan() { # $1=regex  $2=path
  grep -rEIl "$1" "$2" "${SRC_EXT[@]}" "${EXCLUDE[@]}" 2>/dev/null
}
count() { # $1=regex  $2=path  -> total match count
  # DUMP=<file> appends every match, so a count can always be traced back to the
  # lines that produced it. Added after the first run reported 1725 "hex colours"
  # in crm7 that turned out to be GitHub issue refs — never trust a bare count.
  if [[ -n "${DUMP:-}" ]]; then
    grep -rEIo "$1" "$2" "${SRC_EXT[@]}" "${EXCLUDE[@]}" 2>/dev/null | tee -a "$DUMP" | wc -l
  else
    grep -rEIo "$1" "$2" "${SRC_EXT[@]}" "${EXCLUDE[@]}" 2>/dev/null | wc -l
  fi
}

if [[ "${1:-}" == "--files" ]]; then
  case "${2:-}" in
    C1)  RE="$C1_TW|$C1_LIT" ;;   C2) RE="$C2_HEX|$C2_RGB|$C2_HSL" ;;
    C3)  RE="$C3_PALETTE|$C3_ARBITRARY" ;; C4) RE="$C4" ;;
    *) echo "class must be C1|C2|C3|C4" >&2; exit 2 ;;
  esac
  for a in "${APPS[@]}"; do [[ -d $a ]] && scan "$RE" "$a"; done
  exit 0
fi

# real <matches not in an exception path>  /  exc <matches in an exception path>
split() { # $1=regex $2=path [$3=exception regex, default EXCEPTION_RE] -> "real exc"
  local out real exc exception
  exception="${3:-$EXCEPTION_RE}"
  out=$(emit "$1" "$2")
  [[ -n "${DUMP:-}" && -n "$out" ]] && printf '%s\n' "$out" >> "$DUMP"
  # `grep -c` PRINTS a count and EXITS 1 when that count is zero, so `|| echo 0`
  # appended a SECOND line rather than supplying a missing one: `real` became
  # "0\n0", and the `read -r c1r c1e` below then consumed only the first line —
  # leaving the EXEMPT figure blank in every row whose real count was zero.
  # Visible in the output as `0 /` with nothing after the slash (braden's C1 row
  # has read that way for as long as this script has existed). The count itself
  # was never wrong; the column next to it was silently dropped.
  real=$(printf '%s' "$out" | grep -cEv "$exception" 2>/dev/null || true)
  exc=$(printf '%s'  "$out" | grep -cE  "$exception" 2>/dev/null || true)
  [[ -z "$out" || -z "$real" ]] && real=0
  [[ -z "$out" || -z "$exc" ]] && exc=0
  echo "$real $exc"
}

printf '%-24s %14s %14s %14s %14s\n' \
  SUBMODULE 'C1 white/black' 'C2 non-oklch' 'C3 bypass' 'C4 destructive'
printf '%s\n' "$(printf '%.0s─' {1..84})"
printf '%-24s %14s %14s %14s %14s\n' '' 'real / exempt' 'real / exempt' 'real / exempt' 'real / exempt'

for a in "${APPS[@]}"; do
  [[ -d $a ]] || { printf '%-24s %14s\n' "$a" 'ABSENT'; continue; }
  # C1 is the ABSOLUTE ban: only a NAMING exemption may hide it. Passing the
  # format exemptions here is what buried 17 pure whites in crm7's PDFs.
  read -r c1r c1e <<<"$(split "$C1_TW|$C1_LIT" "$a" "$NAMING_EXCEPTION_RE")"
  read -r c2r c2e <<<"$(split "$C2_HEX|$C2_RGB|$C2_HSL" "$a")"
  read -r c3r c3e <<<"$(split "$C3_PALETTE|$C3_ARBITRARY" "$a")"
  read -r c4r c4e <<<"$(split "$C4" "$a")"
  printf '%-24s %14s %14s %14s %14s\n' "$a" \
    "$c1r / $c1e" "$c2r / $c2e" "$c3r / $c3e" "$c4r / $c4e"
done

echo
echo "braden/ is exempt from the D2C PALETTE only (red/gold/navy is its corporate identity)."
echo "It is NOT exempt from C1 — the pure white/black ban is platform-wide (ruling 2026-08-02)."
echo "packages/ IS in scope for C1: the token source ships the value it forbids downstream."
echo "Counts are raw matches; run --files <CLASS> for the file list, and triage"
echo "legitimate exceptions (email templates, SVG brand assets, theme-color meta,"
echo "manifest, chart/PDF/canvas export) before treating a count as a defect count."
