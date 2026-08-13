#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

function isTailwindV4Range(spec) {
  if (typeof spec !== 'string') return false;
  const normalized = spec.trim();
  if (/^(workspace:|file:|link:)/.test(normalized)) return false;
  if (/^[~^]?([0-3])(\.|$)/.test(normalized)) return false;
  if (/^>=\s*([0-3])(\.|$)/.test(normalized)) return false;
  if (/^>\s*3(\.|$)/.test(normalized)) return false;
  if (/^([<>]=?|=)/.test(normalized) && !/^>=\s*4(\.|$)/.test(normalized)) return false;
  return /^[~^]?([4-9]|\d{2,})(\.|$)/.test(normalized) || /^>=\s*([4-9]|\d{2,})(\.|$)/.test(normalized);
}

async function walk(dir, fileName, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return out;
    throw error;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      await walk(full, fileName, out);
    } else if (entry.isFile() && entry.name === fileName) {
      out.push(full);
    }
  }
  return out;
}

function tailwindSpecs(pkg) {
  const scopes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const specs = [];
  for (const scope of scopes) {
    const spec = pkg?.[scope]?.tailwindcss;
    if (spec) specs.push({ scope, spec });
  }
  return specs;
}

async function checkPackageManifests() {
  const files = await walk(root, 'package.json');
  const failures = [];

  for (const file of files) {
    const relative = path.relative(root, file);
    const pkg = JSON.parse(await readFile(file, 'utf8'));
    for (const { scope, spec } of tailwindSpecs(pkg)) {
      if (!isTailwindV4Range(spec)) {
        failures.push(`${relative}: ${scope}.tailwindcss=${JSON.stringify(spec)} permits Tailwind below v4`);
      }
    }
  }

  return { count: files.length, failures };
}

async function checkLockfiles() {
  const files = await walk(root, 'pnpm-lock.yaml');
  const failures = [];

  for (const file of files) {
    const relative = path.relative(root, file);
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (/^\s{2}tailwindcss@[0-3]\./.test(line) || /version: .*tailwindcss@[0-3]\./.test(line)) {
        failures.push(`${relative}:${index + 1}: resolved Tailwind below v4`);
      }
    });
  }

  return { count: files.length, failures };
}

const manifests = await checkPackageManifests();
const lockfiles = await checkLockfiles();
const failures = [...manifests.failures, ...lockfiles.failures];

if (failures.length > 0) {
  console.error('Tailwind v4+ policy failed. Tailwind v3 is not allowed in BSuite.');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

// A guard that walked zero manifests and zero lockfiles has not verified the
// policy — it has verified nothing, from (most likely) the wrong `process.cwd()`.
// Found live 2026-08-13 by bsuite's guard-self-reporting meta-check (LANE-WATCHER):
// this script's original clean-pass message named no count at all, so a walk that
// silently found nothing (wrong cwd, moved directory, ignoredDirs swallowing the
// whole tree) was indistinguishable from a real, clean scan of the monorepo.
if (manifests.count === 0 && lockfiles.count === 0) {
  console.error(
    `Tailwind v4+ policy: CANNOT REPORT — walked ${root} and found 0 package.json and `
      + '0 pnpm-lock.yaml files. Refusing to report a clean policy check against nothing.',
  );
  process.exit(1);
}

console.log(
  `Tailwind v4+ policy OK: ${manifests.count} package manifest(s) and ${lockfiles.count} `
    + 'lockfile(s) scanned, none resolve Tailwind below v4.',
);
