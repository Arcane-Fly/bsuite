#!/usr/bin/env bash
# Prove every built @bsuite/* package can actually be imported under Node ESM.
#
# WHY THIS EXISTS
# Six packages shipped to npm unimportable from Node. The version resolved, the
# symbol was present in the tarball, `exports` listed the path — and `import()`
# still threw. The Vite browser build masks it completely (esbuild resolves
# extensions), so `pnpm build` was green throughout. It surfaced only when a crm7
# implementer tried to use @bsuite/nav-core, broke 27 unrelated test files, and
# reverted correct work believing there was no way around it.
#
# WHY IT EXECUTES AN IMPORT RATHER THAN GREPPING dist/
# @bsuite/jodie's dist/index.js was CLEAN. It broke one file down, in
# dist/sla-tracker.js importing './routing-matrix'. Any check cheap enough to be
# a file read is cheap enough to miss that. Only a real import walks the tree.
#
# WHY IT TESTS EVERY SUBPATH, NOT JUST THE ROOT
# The first version of this script checked only the package root, and reported
# @bsuite/theme PASS. The crm7 lane then measured the SUBPATHS: `./react` and
# `./ssr` both threw ERR_MODULE_NOT_FOUND. `./react` is the entry every consumer
# actually uses — ThemeProvider, BrandingProvider — so the one subpath that
# mattered most was the one a root-only check could not see. That is the same
# failure this script exists to prevent, committed by the script itself: an
# instrument answering an adjacent question and reporting PASS. Subpaths are now
# read from the package's own `exports` map so the check cannot drift from what
# the package actually publishes.
#
# Precedent: precedent__bsuite__20260802__shared_package_change_needs_tarball_and_ranges
# clause (b). Usage: scripts/verify-esm-imports.sh
set -uo pipefail
cd "$(dirname "$0")/.."

# Packages whose JS entry imports CSS cannot be imported by Node at all
# (ERR_UNKNOWN_FILE_EXTENSION). That is a different defect with a different
# remedy — they are browser-bundler-only today. Listed explicitly so the
# exemption is a visible decision rather than a silent pass.
BROWSER_ONLY=(page-builder schema-builder)

fail=0; checked=0; skipped=()
for dir in packages/*/; do
  pkg="$(basename "$dir")"
  [[ -f "$dir/package.json" ]] || continue
  [[ -f "$dir/dist/index.js" ]] || { skipped+=("$pkg (no dist — not built)"); continue; }
  # A STALE dist is not a broken export, and the difference matters.
  #
  # @bsuite/ui reported "FAIL @bsuite/ui/use-on-click-outside — Cannot find module
  # dist/hooks/useOnClickOutside.js". The PUBLISHED package has that file and a correct
  # exports entry; the local dist was simply 13 source files behind and had never
  # emitted hooks/. The gate could tell "no dist at all" from "dist present" but not
  # "dist present and stale", so it reported a build-artifact age as a packaging defect
  # — and that reading cost a previous pass real time before the tarball settled it.
  if [[ -n "$(find "$dir/src" -newer "$dir/dist/index.js" \( -name '*.ts' -o -name '*.tsx' \) -print -quit 2>/dev/null)" ]]; then
    n=$(find "$dir/src" -newer "$dir/dist/index.js" \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | wc -l)
    skipped+=("$pkg (dist is STALE — $n src file(s) newer; run pnpm --filter $pkg build)")
    continue
  fi
  if printf '%s\n' "${BROWSER_ONLY[@]}" | grep -qx "$pkg"; then
    skipped+=("$pkg (browser-only: JS entry imports CSS)"); continue
  fi
  # Every JS subpath the package declares in `exports`, root included. Reading
  # them from the manifest rather than hardcoding means a newly added subpath is
  # covered the day it ships.
  mapfile -t subpaths < <(node -e "
    const e=require('./$dir/package.json').exports;
    if(!e){console.log('.');process.exit(0)}
    for(const k of Object.keys(e)){
      const v=e[k];
      const t=typeof v==='string'?v:(v&&(v.import||v.default));
      if(typeof t==='string' && /\.[cm]?js\$/.test(t)) console.log(k);
    }" 2>/dev/null)
  [[ ${#subpaths[@]} -eq 0 ]] && subpaths=(".")

  for sp in "${subpaths[@]}"; do
    spec="@bsuite/$pkg${sp#.}"
    checked=$((checked + 1))
    if out=$(cd "$dir" && node -e "import('$spec')" 2>&1); then
      printf '  ok    %s\n' "$spec"
    else
      printf '  FAIL  %s\n        %s\n' "$spec" "$(printf '%s' "$out" | grep -m1 -E 'Error|Cannot' | cut -c1-160)"
      fail=$((fail + 1))
    fi
  done
done

for s in "${skipped[@]}"; do printf '  skip  %s\n' "$s"; done

echo
if [[ $fail -gt 0 ]]; then
  echo "FAIL: $fail of $checked packages cannot be imported under Node ESM."
  echo
  echo "Most likely cause: an extensionless relative specifier. \`tsc\` NEVER rewrites"
  echo "specifiers, so plain tsc + \"type\": \"module\" emits \`from './utils'\`, which"
  echo "Node ESM cannot resolve (unlike CJS it does not retry with extensions)."
  echo "FIX: write the extension in the TypeScript SOURCE — \`from './utils.js'\`."
  echo "tsc resolves the .js specifier to the .ts file at compile time and emits it"
  echo "verbatim. No tsconfig setting fixes this — not module, not moduleResolution."
  echo "Adding subpaths to \`exports\` does NOT fix it either: these are INTERNAL"
  echo "relative specifiers, resolved straight against the filesystem, and \`exports\`"
  echo "only gates how EXTERNAL consumers address a package."
  exit 1
fi
# A ZERO DENOMINATOR IS NOT A PASS.
#
# `checked` only increments for a package that has dist/index.js. This script's
# CI precondition is `pnpm -r --filter "./packages/**" build` (theme-conformance
# .yml, "Install and build packages"). If that step is ever skipped, mistyped,
# or partially fails, EVERY package lands in `skipped` and this used to print
#
#     PASS: all 0 built packages import cleanly under Node ESM.
#
# — exit 0, green tick, nothing imported. LANE-WATCHER filed exactly that
# (guard-registry knownSilentReason for parent-verify-esm-imports): the guard
# had no floor requiring a non-zero built-package count, unlike
# check-secret-naming.sh's UNSCANNED refusal.
#
# The number of packages that EXIST is the honest denominator to check against,
# because "nothing was built" and "there are no packages" are different faults
# and neither is a pass.
present=0
for dir in packages/*/; do [[ -f "$dir/package.json" ]] && present=$((present + 1)); done

if [[ $present -eq 0 ]]; then
  echo "REFUSING TO PASS: found no packages under packages/ at all."
  echo "Either this is not the repo root, or the package tree is missing."
  echo "A check that examined nothing has not verified anything."
  exit 1
fi

if [[ $checked -eq 0 ]]; then
  echo "REFUSING TO PASS: $present package(s) exist, 0 were importable-checked."
  echo "Every one was skipped — ${#skipped[@]} skip(s) listed above."
  echo
  echo "This almost always means the build precondition did not run. This script"
  echo "imports from dist/, so it needs \`pnpm -r --filter \"./packages/**\" build\`"
  echo "first (theme-conformance.yml, \"Install and build packages\")."
  echo "Passing here would rubber-stamp an unbuilt tree."
  exit 1
fi

echo "PASS: $checked subpath(s) across $present package(s) import cleanly under Node ESM (${#skipped[@]} skipped)."
