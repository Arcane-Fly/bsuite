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

  return failures;
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

  return failures;
}

const manifestFailures = await checkPackageManifests();
const lockfileFailures = await checkLockfiles();
const failures = [...manifestFailures, ...lockfileFailures];

if (failures.length > 0) {
  console.error('Tailwind v4+ policy failed. Tailwind v3 is not allowed in BSuite.');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('Tailwind v4+ policy OK: no package manifests or lockfiles resolve Tailwind below v4.');
