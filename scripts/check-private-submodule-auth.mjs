#!/usr/bin/env node
/**
 * Fail closed when a workflow would recursively clone private BSuite apps
 * without a short-lived GitHub App installation token.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowsDir = new URL('../.github/workflows/', import.meta.url);
const recursive = /submodules:\s*(?:recursive|true|'recursive'|"recursive"|'true'|"true")/;
const failures = [];
let checked = 0;

for (const file of readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name)).sort()) {
  const lines = readFileSync(join(workflowsDir.pathname, file), 'utf8').split('\n');
  for (let start = 0; start < lines.length; start += 1) {
    if (!/^\s{6}-\s/.test(lines[start])) continue;
    const end = lines.findIndex((line, index) => index > start && /^\s{6}-\s/.test(line));
    const step = lines.slice(start, end === -1 ? lines.length : end).join('\n');
    if (!/uses:\s*actions\/checkout@/.test(step) || !recursive.test(step)) continue;

    checked += 1;
    const jobStart = [...lines.slice(0, start)].map((line, index) => ({ line, index }))
      .reverse().find(({ line }) => /^\s{2}[A-Za-z0-9_-]+:\s*$/.test(line))?.index ?? 0;
    const job = lines.slice(jobStart, start).join('\n');
    const label = `${file}:${start + 1}`;
    if (!/token:\s*\$\{\{\s*steps\.app-token\.outputs\.token\s*}}/.test(step)) {
      failures.push(`${label}: recursive checkout does not use steps.app-token.outputs.token`);
    }
    if (!/id:\s*app-token/.test(job) || !/uses:\s*actions\/create-github-app-token@v3/.test(job)) {
      failures.push(`${label}: job does not mint an App token before recursive checkout`);
    }
    if (!/permission-contents:\s*(?:read|write)/.test(job) || !/permission-metadata:\s*read/.test(job)) {
      failures.push(`${label}: App token is not explicitly scoped`);
    }
    if (/token:.*BSUITE_CROSS_REPO_PAT/.test(step)) {
      failures.push(`${label}: recursive checkout still has a legacy PAT path`);
    }
  }
}

if (checked === 0) failures.push('no recursive checkout steps found; probe is stale');
if (failures.length) {
  console.error(`private-submodule auth guard failed (${failures.length} findings across ${checked} checkouts):`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`private-submodule auth guard passed: ${checked} recursive checkout steps use App tokens`);
