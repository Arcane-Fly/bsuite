import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanCardHeadings, jsxTags } from '../scanner/cardHeadingScanner.js';

/**
 * DEFECT INJECTION, per the doctrine at the head of cardSurfaceScanner.test.ts.
 *
 * The point of this scanner is that `<h2>` is NOT the same thing as "card
 * heading". Every negative control below is a heading a raw `<h2` grep would
 * have swept and the operator did not ask for.
 */
let root: string;
function write(rel: string, content: string) {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}
const BASE = {
  scanRoots: ['src/pages'],
  cardTags: ['Card', 'StatCard'],
  nestedChromeTags: ['Card', 'StatCard', 'MagicCard'],
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'card-heading-'));
  mkdirSync(join(root, 'src/pages'), { recursive: true });
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('a CARD heading is a heading inside a card, not any <h2>', () => {
  it('CATCHES an h2 inside a Card component', () => {
    write(
      'src/pages/in-card.tsx',
      `export const P = () => (<Card><h2 className="text-lg">Quick Actions</h2></Card>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    const f = r.findings.filter((x) => x.file === 'src/pages/in-card.tsx');
    expect(f).toHaveLength(1);
    expect(f[0].tag).toBe('h2');
    expect(f[0].hasGradient).toBe(false);
  });

  it('CATCHES an h3 inside a class-declared card surface', () => {
    write(
      'src/pages/in-div.tsx',
      `export const P = () => (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3>Communication Center</h3>
        </div>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file === 'src/pages/in-div.tsx' && x.tag === 'h3')).toBe(true);
  });

  it('NEGATIVE CONTROL: a page-level h2 outside any card is NOT a card heading', () => {
    // The whole reason this scanner exists. 734 raw h2/h3 exist estate-wide and
    // 273 are inside a card; a grep-driven sweep would have gradiented 461
    // headings nobody asked about — dialog titles, empty states, section labels.
    write(
      'src/pages/bare-heading.tsx',
      `export const P = () => (<div className="space-y-4"><h2>Section</h2></div>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file === 'src/pages/bare-heading.tsx')).toBe(false);
  });

  it('NEGATIVE CONTROL: an h2 in a SIBLING of the card is not inside it', () => {
    // Proves the ancestry check is a real stack and not "the file contains a
    // Card somewhere", which is how three of the five hand-rolled card scanners
    // decided what was gridded.
    write(
      'src/pages/sibling.tsx',
      `export const P = () => (<div><Card>body</Card><h2>After the card</h2></div>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file === 'src/pages/sibling.tsx')).toBe(false);
  });

  it('does not count h1 — the page title is already done, at 183 of 232 in crm7', () => {
    write('src/pages/title.tsx', `export const P = () => (<Card><h1>Dashboard</h1></Card>)`);
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file === 'src/pages/title.tsx')).toBe(false);
  });

  it('reports a heading that ALREADY has the gradient as done, not as missing', () => {
    write(
      'src/pages/done.tsx',
      `export const P = () => (<Card><h2 className="text-gradient-accent text-lg">Done</h2></Card>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file === 'src/pages/done.tsx');
    expect(f?.hasGradient).toBe(true);
  });
});

describe('the width-dependent flag — `fit-content` is load-bearing AND a hazard', () => {
  it('FLAGS a truncating card heading, because fit-content never truncates', () => {
    write(
      'src/pages/truncating.tsx',
      `export const P = () => (<Card><h2 className="truncate flex-1">Long name</h2></Card>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file === 'src/pages/truncating.tsx');
    expect(f?.widthDependentClasses.sort()).toEqual(['flex-1', 'truncate']);
  });

  it('does NOT flag an ordinary card heading', () => {
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file === 'src/pages/in-card.tsx');
    expect(f?.widthDependentClasses).toEqual([]);
  });
});

describe('D-92 — a file whose tags do not balance is UNKNOWN, not clean', () => {
  it('reports UNKNOWN and DISCARDS that file\'s findings rather than trusting them', () => {
    // An ancestry answer from a stack that lost its place is worse than no
    // answer, because it looks like a measurement.
    write(
      'src/pages/unbalanced.tsx',
      `export const P = () => (<Card><h2>Heading</h2></Card></div>)`,
    );
    const r = scanCardHeadings({ ...BASE, projectRoot: root });
    expect(r.unknownFiles).toContain('src/pages/unbalanced.tsx');
    expect(r.findings.some((x) => x.file === 'src/pages/unbalanced.tsx')).toBe(false);
    expect(r.summary).toMatch(/UNKNOWN file\(s\)/);
  });

  it('THROWS on a missing scan root rather than reporting a confident zero', () => {
    expect(() =>
      scanCardHeadings({ ...BASE, projectRoot: root, scanRoots: ['src/nope'] }),
    ).toThrow(/does not exist/);
  });
});

describe('jsxTags', () => {
  it('classifies open, close and self-closing tags', () => {
    const t = jsxTags('<div><br/><span>x</span></div>');
    expect(t.map((x) => `${x.kind}:${x.tag}`)).toEqual([
      'open:div', 'self:br', 'open:span', 'close:span', 'close:div',
    ]);
  });

  it('treats a void element as self-closing even when written unclosed', () => {
    // `<img src=...>` has no closing tag. Pushing it would unbalance every
    // ancestry answer after it.
    const t = jsxTags('<div><img src="a.png"><h2>T</h2></div>');
    expect(t.map((x) => `${x.kind}:${x.tag}`)).toEqual([
      'open:div', 'self:img', 'open:h2', 'close:h2', 'close:div',
    ]);
  });

  it('is not fooled by a `>` inside an attribute expression', () => {
    const t = jsxTags('<Foo bar={a > b} baz="x>y"><h2>T</h2></Foo>');
    expect(t.map((x) => `${x.kind}:${x.tag}`)).toEqual([
      'open:Foo', 'open:h2', 'close:h2', 'close:Foo',
    ]);
  });
});
