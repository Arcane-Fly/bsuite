import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const strict = process.argv.includes('--strict');

const apps = [
  'business-suite-unified',
  'crm7',
  'conduit',
  'R80.3',
  'throughput',
  'braden',
];

const requiredFiles = [
  'autonoma/AUTONOMA.md',
  'autonoma/features.json',
  'autonoma/scenarios.md',
];

const testFileSuffixes = [
  '.spec.ts',
  '.spec.tsx',
  '.spec.js',
  '.spec.jsx',
  '.test.ts',
  '.test.tsx',
  '.test.js',
  '.test.jsx',
];

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isENOENTError(error) {
  if (!(error instanceof Error)) return false;
  if (!('code' in error)) return false;
  return error.code === 'ENOENT';
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (isENOENTError(error)) {
      return false;
    }
    throw error;
  }
}

async function getMarkdownFileNames(targetDir) {
  if (!(await pathExists(targetDir))) return [];
  const entries = await readdir(targetDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name);
}

async function getTestFileNames(targetDir) {
  if (!(await pathExists(targetDir))) return [];
  const entries = await readdir(targetDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => testFileSuffixes.some((suffix) => name.endsWith(suffix)));
}

const results = [];
let hasFailures = false;

for (const app of apps) {
  const appPath = path.join(process.cwd(), app);
  let appEntries = [];
  try {
    appEntries = await readdir(appPath, { withFileTypes: true });
  } catch (error) {
    if (isENOENTError(error)) {
      hasFailures = true;
      results.push({ app, status: 'FAIL', details: 'App directory not found in checkout' });
      continue;
    }
    throw error;
  }

  if (appEntries.length === 0) {
    const isFailure = strict;
    const status = isFailure ? 'FAIL' : 'WARN';
    hasFailures = hasFailures || isFailure;
    results.push({
      app,
      status,
      details: 'Submodule not initialized (empty directory)',
    });
    continue;
  }

  const missingFiles = [];
  for (const relativeFile of requiredFiles) {
    const target = path.join(appPath, relativeFile);
    if (!(await pathExists(target))) {
      missingFiles.push(relativeFile);
    }
  }

  const skillsFiles = await getMarkdownFileNames(path.join(appPath, 'autonoma/skills'));
  if (skillsFiles.length === 0) {
    missingFiles.push('autonoma/skills/*.md');
  }

  const qaTests = await getTestFileNames(path.join(appPath, 'autonoma/qa-tests'));
  if (qaTests.length === 0) {
    missingFiles.push('autonoma/qa-tests/*.{spec,test}.{ts,tsx,js,jsx}');
  }

  if (missingFiles.length > 0) {
    hasFailures = true;
    results.push({
      app,
      status: 'FAIL',
      details: `Missing: ${missingFiles.join(', ')}`,
    });
    continue;
  }

  results.push({ app, status: 'PASS', details: 'All required Autonoma artifacts are present' });
}

console.log('Autonoma adoption audit');
for (const result of results) {
  console.log(`- ${result.app}: ${result.status} — ${result.details}`);
}

if (hasFailures) {
  process.exit(1);
}
