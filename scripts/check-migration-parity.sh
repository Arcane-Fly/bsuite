#!/usr/bin/env bash
# check-migration-parity.sh — the @bsuite/schema-builder dev-fixture migrations must
# stay in sync with the BSU canonical copies.
#
# THE RISK, named in docs/adr/ADR-0008-schema-builder-consolidation.md (Accepted, still
# in force): "the reference migration in the package must stay in sync with the BSU
# canonical copy. Mitigation: `check-migration-parity.sh` CI check added in Phase 6."
#
# That check was never added. The ADR has carried a named mitigation for its own top
# risk since 2026-05-01 with nothing behind the name — and an ADR is exactly the document
# a future reader trusts without re-deriving. As it happens all five files ARE currently
# in sync, so this gate banks a good state rather than reporting a bad one; that is luck,
# not a control.
#
# WHY THIS IS NOT A BYTE COMPARE
#
# The two copies are DELIBERATELY different in their headers. Each one says which it is:
#
#   package:  "DEV-FIXTURE COPY — DO NOT EDIT HERE. Canonical location: business-suite-…"
#   BSU:      "CANONICAL location. @bsuite/schema-builder retains a dev-fixture copy at …"
#
# That is good practice — a file that states its own provenance cannot be edited in the
# wrong place by accident. A byte-compare gate would be red on day one and switched off
# by the end of the week, which is how a gate becomes a skipped step.
#
# So the comparison strips ONLY comment lines carrying a provenance marker, and compares
# everything else byte for byte. Stripping all `--` comments would be simpler and wrong
# twice over: a real comment divergence would pass, and a `--` inside a string literal
# would truncate live SQL.

set -uo pipefail

PKG_DIR="packages/schema-builder/supabase/migrations"
CANON_DIR="business-suite-unified/supabase/migrations"
PROVENANCE='dev-fixture|DEV-FIXTURE|canonical|CANONICAL|packages/schema-builder|business-suite-unified'

# A PROVENANCE NOTE IS A BLOCK, NOT A LINE.
#
# The first version dropped individual comment lines carrying a marker word, and every
# one of the five files still reported DIVERGED — on the note's own CONTINUATION lines
# ("This copy exists only so `pnpm --filter ...` can spin up a self-contained fixture").
# The marker sits on line one of the note; the rest of the sentence does not repeat it.
#
# So the unit is a contiguous run of `--` lines: if ANY line in the run names the
# provenance, the whole run is the note and comes out. A run with no marker is an
# ordinary comment and stays, which is what keeps the third self-test honest.
strip_provenance() {
  awk -v prov="$PROVENANCE" '
    function flush(  i) {
      if (!hit) for (i = 1; i <= n; i++) print buf[i]
      n = 0; hit = 0
    }
    /^[[:space:]]*--/ { buf[++n] = $0; if ($0 ~ prov) hit = 1; next }
    { flush(); print }
    END { flush() }
  ' "$1"
}

self_test() {
  local tmp rc=0; tmp=$(mktemp -d)
  printf -- '-- DEV-FIXTURE COPY\nSELECT 1;\n'  > "$tmp/a.sql"
  printf -- '-- CANONICAL location\nSELECT 1;\n' > "$tmp/b.sql"
  if diff -q <(strip_provenance "$tmp/a.sql") <(strip_provenance "$tmp/b.sql") >/dev/null; then
    echo "  ok    a provenance-header difference is NOT a parity failure"
  else echo "  FAIL  a provenance-header difference is NOT a parity failure"; rc=1; fi

  printf -- '-- DEV-FIXTURE COPY\nSELECT 1;\n' > "$tmp/c.sql"
  printf -- '-- CANONICAL location\nSELECT 2;\n' > "$tmp/d.sql"
  if diff -q <(strip_provenance "$tmp/c.sql") <(strip_provenance "$tmp/d.sql") >/dev/null; then
    echo "  FAIL  POSITIVE CONTROL: a real SQL divergence must fail"; rc=1
  else echo "  ok    POSITIVE CONTROL: a real SQL divergence fails"; fi

  printf -- '-- DEV-FIXTURE COPY\n-- This copy exists only for the test fixture.\nSELECT 1;\n' > "$tmp/i.sql"
  printf -- '-- CANONICAL location\nSELECT 1;\n' > "$tmp/j.sql"
  if diff -q <(strip_provenance "$tmp/i.sql") <(strip_provenance "$tmp/j.sql") >/dev/null; then
    echo "  ok    a provenance note is a BLOCK — continuation lines go with it"
  else echo "  FAIL  a provenance note is a BLOCK — continuation lines go with it"; rc=1; fi

  printf -- '-- note: keep the CASE arm\nSELECT 1;\n' > "$tmp/e.sql"
  printf -- '-- note: drop the CASE arm\nSELECT 1;\n' > "$tmp/f.sql"
  if diff -q <(strip_provenance "$tmp/e.sql") <(strip_provenance "$tmp/f.sql") >/dev/null; then
    echo "  FAIL  a NON-provenance comment divergence must still fail"; rc=1
  else echo "  ok    a NON-provenance comment divergence still fails"; fi

  printf -- "SELECT 'a--b';\n" > "$tmp/g.sql"
  printf -- "SELECT 'a--c';\n" > "$tmp/h.sql"
  if diff -q <(strip_provenance "$tmp/g.sql") <(strip_provenance "$tmp/h.sql") >/dev/null; then
    echo "  FAIL  a '--' inside a STRING must not be treated as a comment"; rc=1
  else echo "  ok    a '--' inside a STRING is not treated as a comment"; fi

  rm -rf "$tmp"; return $rc
}

if [ "${1:-}" = "--self-test" ]; then self_test; exit $?; fi

if [ ! -d "$PKG_DIR" ] || [ ! -d "$CANON_DIR" ]; then
  echo "  POSITIVE CONTROL FAILED: $PKG_DIR or $CANON_DIR is missing."
  echo "  An uninitialised submodule is an empty directory that passes every -d test,"
  echo "  and a gate that scans nothing reports exactly what a clean gate reports."
  exit 3
fi

shopt -s nullglob
files=("$PKG_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "  POSITIVE CONTROL FAILED: no dev-fixture migrations found in $PKG_DIR."
  exit 3
fi

fail=0
for f in "${files[@]}"; do
  b=$(basename "$f"); canon="$CANON_DIR/$b"
  if [ ! -f "$canon" ]; then
    printf '  %-56s NO CANONICAL COPY in %s\n' "$b" "$CANON_DIR"; fail=1; continue
  fi
  if diff -q <(strip_provenance "$f") <(strip_provenance "$canon") >/dev/null; then
    printf '  %-56s in sync\n' "$b"
  else
    printf '  %-56s ** DIVERGED **\n' "$b"
    diff <(strip_provenance "$canon") <(strip_provenance "$f") | head -20 | sed 's/^/        /'
    fail=1
  fi
done

echo
if [ "$fail" -ne 0 ]; then
  echo "  BSU IS CANONICAL. Edit $CANON_DIR first, then copy the body verbatim into"
  echo "  $PKG_DIR, keeping each file's own provenance header."
  echo "  Authority: docs/adr/ADR-0008-schema-builder-consolidation.md."
  exit 1
fi
echo "  ${#files[@]} dev-fixture migration(s) match the BSU canonical copies."
