import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const roots = [
  'R80.4/src',
  'braden/src',
  'business-suite-unified/src',
  'conduit/src',
  'crm7/src',
  'throughput/src',
  'packages/auth/src',
  'packages/nav-core/src',
];
const forbidden = [
  { label: 'cookieStorage', pattern: /\bcookieStorage\b/ },
  { label: 'createCookieStorage', pattern: /\bcreateCookieStorage\b/ },
  { label: 'business_suite_auth', pattern: /business_suite_auth/ },
  { label: 'domain=.crm7.app', pattern: /domain\s*[:=]\s*['"]\.crm7\.app['"]|domain=.crm7.app/ },
  { label: 'shared Supabase storageKey', pattern: /storageKey\s*:\s*['"]business_suite_auth['"]/ },
];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const hits = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(root, full);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) continue;
      await walk(full);
      continue;
    }
    if (!entry.isFile() || !exts.has(path.extname(entry.name))) continue;
    // The per-app CI-enforced oauth-contract suites assert these tokens are
    // ABSENT from app source, so the test files necessarily contain the
    // literals. They are the guard, not a violation.
    if (entry.name === 'oauth-contract.test.ts') continue;
    const content = await readFile(full, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      forbidden.forEach(({ label, pattern }) => {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          hits.push(`${relative}:${index + 1}: forbidden ${label}`);
        }
      });
    });
  }
}

await Promise.all(roots.map((item) => walk(path.join(root, item))));

if (hits.length > 0) {
  console.error('Cookie SSO is forbidden. Use BS OAuth 2.1 PKCE + JWKS only.');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log('No forbidden cookie SSO patterns found.');
