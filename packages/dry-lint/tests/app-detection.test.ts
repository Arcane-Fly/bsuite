import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { _resetAppDetectionCacheForTests, detectAppFromPath } from '../src/app-detection.js';

/**
 * bsuite#1623 fix — `detectAppFromPath` moved from path-SEGMENT matching
 * (fragile: assumes the checkout directory is literally named after the
 * app) to a real filesystem walk that reads each app's own `package.json`
 * `name` field, bounded at the nearest `.git` marker. That means these
 * tests can no longer use synthetic, non-existent paths (`/repo/crm7/...`)
 * — the implementation needs real directories and real `package.json`
 * files on disk. Every case below builds a throwaway fixture tree under
 * `os.tmpdir()` and tears it down afterwards.
 */

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-lint-app-detection-'));
  _resetAppDetectionCacheForTests();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  _resetAppDetectionCacheForTests();
});

/** Write a package.json with the given `name` at `dir`, creating `dir` first. */
function writePackageJson(dir: string, name: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name }), 'utf8');
}

/** Mark `dir` as a repo root the same way real git does (a `.git` directory). */
function writeGitMarkerDir(dir: string): void {
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
}

/**
 * Mark `dir` as a git-WORKTREE root, where `.git` is a FILE (not a
 * directory) pointing at the real gitdir elsewhere — the exact on-disk
 * shape `git worktree add` produces, and the shape bsuite#1623 was found
 * in. `hasGitMarker()` must treat this identically to a `.git` directory.
 */
function writeGitMarkerFile(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.git'), 'gitdir: /some/real/gitdir\n', 'utf8');
}

function writeFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '// fixture file\n', 'utf8');
}

describe('detectAppFromPath', () => {
  it.each([
    ['business-suite-unified', 'bsu'],
    ['crm7-complete', 'crm7'],
    ['conduit', 'conduit'],
    ['braden-app', 'braden'],
    ['r80-calculator', 'r80'],
    ['throughput', 'throughput'],
  ] as const)('detects package.json name "%s" -> %s', (pkgName, expected) => {
    const appDir = path.join(tmpRoot, 'monorepo-root', pkgName);
    writeGitMarkerDir(path.join(tmpRoot, 'monorepo-root'));
    writePackageJson(appDir, pkgName);
    const file = path.join(appDir, 'src', 'lib', 'x.ts');
    writeFile(file);

    expect(detectAppFromPath(file)).toBe(expected);
  });

  it('maps any @bsuite/* scoped package to "shared"', () => {
    const appDir = path.join(tmpRoot, 'monorepo-root', 'packages', 'theme');
    writeGitMarkerDir(path.join(tmpRoot, 'monorepo-root'));
    writePackageJson(appDir, '@bsuite/theme');
    const file = path.join(appDir, 'src', 'index.ts');
    writeFile(file);

    expect(detectAppFromPath(file)).toBe('shared');
  });

  it('returns undefined when the package.json name is unrecognised', () => {
    const appDir = path.join(tmpRoot, 'monorepo-root', 'some-other-tool');
    writeGitMarkerDir(path.join(tmpRoot, 'monorepo-root'));
    writePackageJson(appDir, 'some-other-tool');
    const file = path.join(appDir, 'src', 'index.ts');
    writeFile(file);

    expect(detectAppFromPath(file)).toBeUndefined();
  });

  it('returns undefined when no package.json is found before the .git boundary', () => {
    writeGitMarkerDir(tmpRoot);
    const file = path.join(tmpRoot, 'src', 'index.ts');
    writeFile(file);

    expect(detectAppFromPath(file)).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(detectAppFromPath('')).toBeUndefined();
  });

  it('returns undefined for virtual filenames (no real file on disk)', () => {
    expect(detectAppFromPath('<input>')).toBeUndefined();
    expect(detectAppFromPath('<text>')).toBeUndefined();
  });

  it('lower-cases the package.json name field defensively before matching', () => {
    const appDir = path.join(tmpRoot, 'monorepo-root', 'crm7');
    writeGitMarkerDir(path.join(tmpRoot, 'monorepo-root'));
    writePackageJson(appDir, 'CRM7-Complete');
    const file = path.join(appDir, 'src', 'x.ts');
    writeFile(file);

    expect(detectAppFromPath(file)).toBe('crm7');
  });

  describe('bsuite#1623 regression — bare git-worktree checkout as a SIBLING of bsuite/', () => {
    it('detects the correct app from a worktree whose path has no "bsuite/" segment and whose directory name does not equal the app name', () => {
      // Simulates git worktree add /home/braden/Desktop/Dev/crm7-jodie-worktree
      // exactly (the real reproduction from bsuite#1623) — a checkout that is
      // a SIBLING of bsuite/, not nested inside it, with a directory name
      // ("crm7-jodie-worktree") that does not literally equal "crm7". The
      // home-directory segment is a literal "braden" path segment, matching
      // the operator's real machine, so the old right-to-left segment scan
      // would misfire on it exactly as reported.
      const worktreeDir = path.join(
        tmpRoot,
        'home',
        'braden',
        'Desktop',
        'Dev',
        'crm7-jodie-worktree',
      );
      writeGitMarkerFile(worktreeDir); // git worktrees use a .git FILE, not a dir
      writePackageJson(worktreeDir, 'crm7-complete');
      const file = path.join(worktreeDir, 'src', 'components', 'ai', 'AIMessage.tsx');
      writeFile(file);

      expect(detectAppFromPath(file)).toBe('crm7');
      expect(detectAppFromPath(file)).not.toBe('braden');
    });

    it('does not misattribute a braden-named ancestor segment when the app itself is not braden', () => {
      const worktreeDir = path.join(
        tmpRoot,
        'home',
        'braden',
        'Desktop',
        'Dev',
        'r80-hotfix-worktree',
      );
      writeGitMarkerFile(worktreeDir);
      writePackageJson(worktreeDir, 'r80-calculator');
      const file = path.join(worktreeDir, 'src', 'services', 'x.ts');
      writeFile(file);

      expect(detectAppFromPath(file)).toBe('r80');
    });
  });

  describe('per-directory memoisation', () => {
    it("does not leak one directory's result to a different directory in the same process (F1 class)", () => {
      const bradenDir = path.join(tmpRoot, 'root-a', 'braden-app');
      writeGitMarkerDir(path.join(tmpRoot, 'root-a'));
      writePackageJson(bradenDir, 'braden-app');
      const bradenFile = path.join(bradenDir, 'src', 'x.ts');
      writeFile(bradenFile);

      const crm7Dir = path.join(tmpRoot, 'root-b', 'crm7');
      writeGitMarkerDir(path.join(tmpRoot, 'root-b'));
      writePackageJson(crm7Dir, 'crm7-complete');
      const crm7File = path.join(crm7Dir, 'src', 'y.ts');
      writeFile(crm7File);

      // Resolve braden first, then crm7, in the SAME process/cache instance
      // (no reset in between) — a bare-scalar cache would return 'braden'
      // for both calls.
      expect(detectAppFromPath(bradenFile)).toBe('braden');
      expect(detectAppFromPath(crm7File)).toBe('crm7');
      // And repeating the first call still returns the cached, correct
      // per-directory answer.
      expect(detectAppFromPath(bradenFile)).toBe('braden');
    });
  });
});
