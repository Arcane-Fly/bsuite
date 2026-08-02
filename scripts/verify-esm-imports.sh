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
  if printf '%s\n' "${BROWSER_ONLY[@]}" | grep -qx "$pkg"; then
    skipped+=("$pkg (browser-only: JS entry imports CSS)"); continue
  fi
  checked=$((checked + 1))
  if out=$(cd "$dir" && node -e "import('@bsuite/$pkg')" 2>&1); then
    printf '  ok    @bsuite/%s\n' "$pkg"
  else
    printf '  FAIL  @bsuite/%s\n        %s\n' "$pkg" "$(printf '%s' "$out" | grep -m1 -E 'Error|Cannot' | cut -c1-160)"
    fail=$((fail + 1))
  fi
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
echo "PASS: all $checked built packages import cleanly under Node ESM."
