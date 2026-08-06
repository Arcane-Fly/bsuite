#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const apps = [
  { name: 'business-suite-unified', domain: 'suite.crm7.app', framework: 'vite', requiresAnalytics: true },
  { name: 'crm7', domain: 'crm.crm7.app', framework: 'vite', requiresAnalytics: true },
  { name: 'R80.4', domain: 'r8.crm7.app', framework: 'vite', requiresAnalytics: true },
  { name: 'conduit', domain: 'conduit.crm7.app', framework: 'nextjs', requiresAnalytics: true },
  { name: 'throughput', domain: 'ideas.crm7.app', framework: 'vite', requiresAnalytics: true },
  { name: 'braden', domain: 'www.braden.com.au', framework: 'vite', requiresAnalytics: true },
];

const root = process.cwd();
let failed = 0;
let warned = 0;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function flattenHeaders(vercel) {
  return (vercel.headers ?? []).flatMap((entry) => entry.headers ?? []);
}

function hasHeader(vercel, key) {
  return flattenHeaders(vercel).some((header) => header.key.toLowerCase() === key.toLowerCase());
}

function hasFrameworkHeader(appDir, key) {
  for (const fileName of ['next.config.ts', 'next.config.js', 'next.config.mjs']) {
    const configPath = join(appDir, fileName);
    if (!existsSync(configPath)) continue;
    const source = readFileSync(configPath, 'utf8');
    if (source.includes(key)) return true;
  }
  return false;
}

function hasHeaderForSource(vercel, source, key, valuePattern) {
  return (vercel.headers ?? []).some((entry) => {
    if (entry.source !== source) return false;
    return (entry.headers ?? []).some((header) => {
      if (header.key.toLowerCase() !== key.toLowerCase()) return false;
      return valuePattern ? valuePattern.test(header.value) : true;
    });
  });
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  warned += 1;
  console.warn(`⚠ ${message}`);
}

function fail(message) {
  failed += 1;
  console.error(`✗ ${message}`);
}

for (const app of apps) {
  const appDir = join(root, app.name);
  const vercelPath = join(appDir, 'vercel.json');
  const packagePath = join(appDir, 'package.json');
  const lockPath = join(appDir, 'pnpm-lock.yaml');

  console.log(`\n## ${app.name} (${app.domain})`);

  if (!existsSync(vercelPath)) {
    fail(`${app.name}: vercel.json missing`);
    continue;
  }

  const vercel = readJson(vercelPath);
  const packageJson = existsSync(packagePath) ? readJson(packagePath) : { dependencies: {}, devDependencies: {} };
  const dependencies = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };

  if (vercel.framework === app.framework) pass('framework matches expected value');
  else fail(`framework should be ${app.framework}, got ${vercel.framework ?? 'unset'}`);

  if (/--frozen-lockfile/.test(vercel.installCommand ?? '')) pass('install command uses --frozen-lockfile');
  else fail('install command must use --frozen-lockfile');

  if (existsSync(lockPath)) pass('pnpm-lock.yaml committed');
  else fail('pnpm-lock.yaml missing');

  for (const header of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ]) {
    if (hasHeader(vercel, header) || hasFrameworkHeader(appDir, header)) pass(`${header} configured`);
    else fail(`${header} missing`);
  }

  if (hasHeaderForSource(vercel, '/assets/(.*)', 'Cache-Control', /immutable/)) pass('immutable asset cache configured');
  else if (app.framework === 'nextjs' && hasHeaderForSource(vercel, '/_next/static/(.*)', 'Cache-Control', /immutable/)) pass('immutable Next static cache configured');
  else warn('immutable static asset cache not detected');

  if (
    hasHeaderForSource(vercel, '/index.html', 'Cache-Control', /no-cache|no-store/) ||
    hasHeaderForSource(vercel, '/', 'Cache-Control', /no-cache|no-store/) ||
    app.framework === 'nextjs'
  ) {
    pass('HTML/root cache policy is explicit or framework-managed');
  } else {
    warn('HTML/root no-cache header not explicit');
  }

  if (app.requiresAnalytics) {
    if (dependencies['@vercel/speed-insights']) pass('@vercel/speed-insights present');
    else warn('@vercel/speed-insights missing');

    if (dependencies['@vercel/analytics']) pass('@vercel/analytics present');
    else warn('@vercel/analytics missing');
  }
}

console.log(`\nSummary: ${failed} failed, ${warned} warned`);
if (failed > 0) process.exit(1);
