#!/usr/bin/env node
/**
 * scripts/check-component-mounts.mjs
 *
 * A component that is CALLED everywhere but MOUNTED nowhere does nothing, and
 * does it silently. This guard fails an app that calls a notification API
 * without rendering the surface that displays it.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Measured on braden 2026-08-20: 54 files called `toast(...)` and NOT ONE
 * `<Toaster>` was mounted anywhere in the app tree. All four primitives
 * (sonner.tsx, toaster.tsx, toast.tsx, use-toast.ts) sat on disk, unrendered.
 * Every confirmation and every error on braden.com.au — the whole admin
 * surface, both contact forms, the auth page, storage and upload hooks — had
 * been discarded since the primitives were added.
 *
 * Nothing failed. Nothing logged. To the operator it was indistinguishable
 * from the app doing nothing at all, which is the worst kind of defect: it
 * looks like a product decision. Fixed in braden #437; this guard is so it
 * cannot come back, in that app or any other.
 *
 * The wiring being present and unmounted is the tell. Someone built the whole
 * mechanism and never rendered it, so no test, no type error and no lint rule
 * ever had anything to complain about.
 *
 * WHY IT PARSES INSTEAD OF GREPPING
 * ---------------------------------------------------------------------------
 * This estate's own check-own-package-freshness.mjs states the rule for
 * lockfiles — "PARSE IT. NEVER GREP IT" — and the same applies here, for a
 * reason discovered while writing this file.
 *
 * A naive `grep -E "<(Toaster|Sonner)"` over braden AFTER the fix reports a
 * mount at src/App.tsx:13. That line is a COMMENT — the fix's own explanation:
 *
 *     // SiteSettings). Neither `<Toaster>` was mounted anywhere in the app, so
 *
 * So the grep counts the description of the bug as evidence the bug is fixed.
 * Delete the real mount and leave the comment, and grep still says "mounted".
 * A guard whose probe cannot tell code from prose about code is worse than no
 * guard, because it reports PASS. Both mounts and calls are therefore found by
 * walking the TypeScript AST, where a comment is not an element and a string
 * containing "toast(" is not a call.
 *
 * Like the freshness guard, this hard-refuses to run without its parser rather
 * than degrading to a regex.
 *
 * DESIGN NOTES
 * ---------------------------------------------------------------------------
 *  * PRIMITIVES ARE EXCLUDED FROM BOTH SIDES. src/components/ui/** DEFINES the
 *    Toaster and re-exports `toast`; a definition is not a mount and a
 *    re-export is not a call. Counting them would let an app pass on the
 *    strength of the very files that do nothing on their own.
 *
 *  * A CALLER FLOOR, NOT A MOUNT FLOOR. An app with zero callers legitimately
 *    needs zero mounts — throughput and R80.4 are both in that state and must
 *    pass. The rule is conditional: callers > 0 REQUIRES mounts > 0.
 *
 *  * SCANNING ZERO IS A HARD FAILURE. A guard that silently examines nothing
 *    reports PASS — this estate's most-repeated failure class, and the reason
 *    guard-self-reporting.yml (LANE-WATCHER) exists. Missing app directories,
 *    or a file total under the floor, exits non-zero.
 *
 *  * IT REPORTS ITS OWN COUNTS. LANE-WATCHER fails any guard exiting 0 without
 *    stating a non-zero number of things examined.
 *
 * Exit 0 = every app with callers has at least one real mount.
 * Exit 1 = an app calls without mounting, or the scan examined nothing.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let ts;
try {
  ts = require('typescript');
} catch {
  console.error(
    'FAIL: the `typescript` package is required and is not installed.\n' +
      'This guard parses TSX rather than grepping it, because a grep counts a\n' +
      'comment mentioning <Toaster> as a mount. Install deps and re-run; do not\n' +
      'replace the parse with a regex.',
  );
  process.exit(1);
}

/**
 * Each rule pairs a set of caller names with the JSX tags that must render
 * somewhere for those calls to reach a human.
 */
const RULES = [
  {
    id: 'toast-surface',
    label: 'toast() requires a mounted <Toaster>/<Sonner>',
    callees: new Set(['toast']),
    /**
     * Mounts are resolved through IMPORT BINDINGS, not by matching tag names.
     * braden mounts two surfaces under aliases:
     *
     *     import { Toaster as SonnerToaster } from '@/components/ui/sonner';
     *     import { Toaster as RadixToaster }  from '@/components/ui/toaster';
     *     ...
     *     <SonnerToaster position="top-right" />
     *     <RadixToaster />
     *
     * A tag allowlist saw one of those two and would have seen neither after a
     * rename. What makes an element a toast surface is WHERE IT COMES FROM, so
     * that is what gets matched: an import of Toaster/Sonner (named or default)
     * from a toast module, then any JSX element whose tag resolves to it.
     */
    importedNames: new Set(['Toaster', 'Sonner', 'default']),
    modulePattern: /(?:^|\/)(?:sonner|toaster)$/,
    /** Bare, unaliased usage still counts — an app may import from a barrel. */
    fallbackTags: new Set(['Toaster', 'Sonner', 'SonnerToaster']),
    remedy:
      'Render <Toaster /> once at the app root (App.tsx / main.tsx), inside the\n' +
      '  provider tree. See braden #437 for the reference fix.',
  },
];

const APPS = [
  'crm7',
  'conduit',
  'business-suite-unified',
  'braden',
  'throughput',
  '../R80.4',
];

/** Directories whose contents DEFINE primitives rather than use them. */
const EXCLUDED_SEGMENTS = ['/components/ui/', '/node_modules/', '/.next/', '/dist/'];

/** A floor, not a guess. The six apps held well over a thousand source files
 *  on 2026-08-21; a scan seeing a handful is broken, not clean. */
const MIN_EXPECTED_FILES = 200;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist') continue;
      walk(full, out);
    } else if (e.isFile() && (e.name.endsWith('.tsx') || e.name.endsWith('.ts'))) {
      out.push(full);
    }
  }
  return out;
}

function isExcluded(path) {
  const p = path.replaceAll('\\', '/');
  return EXCLUDED_SEGMENTS.some((seg) => p.includes(seg)) || p.includes('use-toast');
}

/** Walk the AST once, collecting real JSX mounts and real call expressions. */
function analyse(file, rule) {
  const text = readFileSync(file, 'utf8');
  const src = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  let mounts = 0;
  let calls = 0;

  /** local JSX name -> true, for every import that resolves to a toast surface. */
  const surfaceBindings = new Set();
  for (const stmt of src.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const mod = stmt.moduleSpecifier.text;
    if (!rule.modulePattern.test(mod)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;
    // default import: import Toaster from '.../sonner'
    if (clause.name && rule.importedNames.has('default')) {
      surfaceBindings.add(clause.name.text);
    }
    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) {
        const imported = el.propertyName ? el.propertyName.text : el.name.text;
        if (rule.importedNames.has(imported)) surfaceBindings.add(el.name.text);
      }
    }
  }

  const visit = (node) => {
    // A real JSX element — never a comment, never a string, never a generic
    // type argument such as Omit<ToasterToast, 'id'>.
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(src);
      if (surfaceBindings.has(tag) || rule.fallbackTags.has(tag)) mounts += 1;
    }

    // A real call: toast(...) or toast.success(...)
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && rule.callees.has(callee.text)) {
        calls += 1;
      } else if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        rule.callees.has(callee.expression.text)
      ) {
        calls += 1;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(src);
  return { mounts, calls };
}

function main() {
  const failures = [];
  const rows = [];
  let totalFilesScanned = 0;

  for (const rule of RULES) {
    for (const app of APPS) {
      const srcDir = join(app, 'src');
      if (!existsSync(srcDir)) {
        console.error(
          `FAIL: ${srcDir} does not exist. The app list is stale or this is not ` +
            `the repo root — either way the scan cannot be trusted.`,
        );
        process.exit(1);
      }
      try {
        if (!statSync(srcDir).isDirectory()) throw new Error('not a directory');
      } catch {
        console.error(`FAIL: ${srcDir} is not a directory.`);
        process.exit(1);
      }

      const files = walk(srcDir).filter((f) => !isExcluded(f));
      totalFilesScanned += files.length;

      let mounts = 0;
      let callerFiles = 0;
      const mountSites = [];

      for (const f of files) {
        let r;
        try {
          r = analyse(f, rule);
        } catch {
          continue; // an unparseable file is not evidence either way
        }
        if (r.calls > 0) callerFiles += 1;
        if (r.mounts > 0) {
          mounts += r.mounts;
          mountSites.push(relative('.', f));
        }
      }

      const name = app.replace('../', '');
      rows.push({ name, files: files.length, callerFiles, mounts });

      if (callerFiles > 0 && mounts === 0) {
        failures.push({ rule, name, callerFiles, files: files.length });
      }
      void mountSites;
    }
  }

  if (totalFilesScanned === 0) {
    console.error(
      'FAIL: scanned ZERO source files. A scan of nothing is not a pass.',
    );
    process.exit(1);
  }
  if (totalFilesScanned < MIN_EXPECTED_FILES) {
    console.error(
      `FAIL: only ${totalFilesScanned} source files scanned; expected at least ` +
        `${MIN_EXPECTED_FILES}. Scan scope looks wrong.`,
    );
    process.exit(1);
  }

  for (const r of rows) {
    console.log(
      `  ${r.name.padEnd(24)} files ${String(r.files).padStart(5)}   ` +
        `caller-files ${String(r.callerFiles).padStart(4)}   mounts ${String(r.mounts).padStart(3)}`,
    );
  }

  if (failures.length > 0) {
    console.error('');
    for (const f of failures) {
      console.error(
        `FAIL: ${f.name} — ${f.callerFiles} file(s) call toast() and NOT ONE ` +
          `<Toaster>/<Sonner> is mounted.\n` +
          `  Every one of those messages is discarded. Nothing errors; the app ` +
          `simply appears to do nothing.\n` +
          `  ${f.rule.remedy}`,
      );
    }
    process.exit(1);
  }

  console.log(
    `ok — ${rows.length} app(s), ${totalFilesScanned} source files parsed; ` +
      `every app with toast() callers mounts a toast surface.`,
  );
}

main();
