/**
 * Reads peer-dependency facts out of a committed `pnpm-lock.yaml`.
 *
 * WHY THE LOCKFILE AND NOT `node_modules`
 *
 * The gate runs on a bare `actions/checkout`. There is no install, so there is
 * no `node_modules` to inspect — and that is the better answer anyway: the
 * lockfile is what `--frozen-lockfile` will install, which is what Vercel runs.
 * Inspecting a local `node_modules` would measure this machine, not the deploy.
 *
 * WHY A LINE PARSER AND NOT A YAML LIBRARY
 *
 * Same reason: no install step, so no `js-yaml`. `pnpm-lock.yaml` is machine
 * written by one emitter with fixed two-space indentation and no anchors,
 * aliases, folded scalars or comments, so the subset needed here is stable.
 * The parser fails loudly on anything unexpected rather than returning a
 * partial answer.
 *
 * WHAT THE LOCKFILE TELLS US, AND THE TRAP IN IT
 *
 *   packages:
 *     '@bsuite/schema-registry@1.0.3':
 *       peerDependencies:
 *         '@bsuite/nav-core': '>=0.8.0 <2'
 *
 *   snapshots:
 *     '@bsuite/schema-registry@1.0.3(@bsuite/nav-core@1.0.1(...))(react@19.2.8)...':
 *
 * The snapshot key carries the RESOLVED version of every peer. The trap,
 * measured on R80.4's pre-fix lockfile on 2026-08-20: pnpm records the
 * resolution EVEN WHEN THE RANGE IS VIOLATED. `@bsuite/nav-core@1.0.1` sat in
 * that key while the declared peer was `^0.8.0`. pnpm warns at install time and
 * writes the lockfile anyway.
 *
 * So "the peer appears in the snapshot key" proves nothing on its own. The
 * version has to be checked against the range. That is the whole reason
 * `semver-range.mjs` exists next to this file.
 */
import fs from 'node:fs';

/** Split `@scope/name@1.2.3` into its parts. The leading @ is the awkward bit. */
export function splitNameVersion(spec) {
  const at = spec.lastIndexOf('@');
  if (at <= 0) return null;
  return { name: spec.slice(0, at), version: spec.slice(at + 1) };
}

/**
 * From a snapshot key, the resolved version of each top-level peer.
 * Nested parentheses belong to that peer's own peers and are skipped.
 */
export function resolvedPeersFromSnapshotKey(key) {
  const out = new Map();
  let depth = 0;
  let start = -1;
  for (let i = 0; i < key.length; i++) {
    const ch = key[i];
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && start >= 0) {
        const group = key.slice(start, i);
        const head = group.split('(')[0];
        const nv = splitNameVersion(head);
        if (nv) out.set(nv.name, nv.version);
        start = -1;
      }
      if (depth < 0) throw new Error(`unbalanced parentheses in snapshot key: ${key}`);
    }
  }
  if (depth !== 0) throw new Error(`unbalanced parentheses in snapshot key: ${key}`);
  return out;
}

const unquote = (s) => s.replace(/^['"]|['"]$/g, '');

/**
 * Parse the `packages:` and `snapshots:` sections.
 * Returns { packages: Map<spec, {peers, optionalPeers}>, snapshotKeys: string[] }
 */
export function parseLockfile(text) {
  const lines = text.split('\n');
  const packages = new Map();
  const snapshotKeys = [];

  let section = null; // 'packages' | 'snapshots' | null
  let current = null; // spec being described
  let sub = null; // 'peerDependencies' | 'peerDependenciesMeta' | null
  let metaKey = null;

  for (const raw of lines) {
    if (raw.trim() === '' ) continue;

    if (/^packages:\s*$/.test(raw)) { section = 'packages'; current = null; sub = null; continue; }
    if (/^snapshots:\s*$/.test(raw)) { section = 'snapshots'; current = null; sub = null; continue; }
    if (/^[a-zA-Z]/.test(raw)) { section = null; current = null; sub = null; continue; }
    if (section === null) continue;

    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();

    if (indent === 2 && line.endsWith(':')) {
      const spec = unquote(line.slice(0, -1));
      current = spec;
      sub = null;
      metaKey = null;
      if (section === 'packages') packages.set(spec, { peers: new Map(), optionalPeers: new Set() });
      else snapshotKeys.push(spec);
      continue;
    }

    if (section !== 'packages' || !current) continue;

    if (indent === 4) {
      sub = line === 'peerDependencies:' ? 'peerDependencies'
          : line === 'peerDependenciesMeta:' ? 'peerDependenciesMeta'
          : null;
      metaKey = null;
      continue;
    }

    if (indent === 6 && sub === 'peerDependencies') {
      const i = line.indexOf(':');
      if (i > 0) {
        packages.get(current).peers.set(unquote(line.slice(0, i)), unquote(line.slice(i + 1).trim()));
      }
      continue;
    }

    if (indent === 6 && sub === 'peerDependenciesMeta') {
      metaKey = unquote(line.replace(/:$/, ''));
      continue;
    }
    if (indent === 8 && sub === 'peerDependenciesMeta' && metaKey) {
      if (/^optional:\s*true$/.test(line)) packages.get(current).optionalPeers.add(metaKey);
      continue;
    }
  }

  return { packages, snapshotKeys };
}

export function readLockfile(p) {
  return parseLockfile(fs.readFileSync(p, 'utf8'));
}
