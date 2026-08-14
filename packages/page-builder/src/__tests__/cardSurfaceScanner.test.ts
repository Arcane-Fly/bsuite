import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanCardSurfaces, stripComments } from '../scanner/cardSurfaceScanner.js';

/**
 * DEFECT INJECTION, not just absence-of-findings.
 *
 * Every one of the five hand-rolled copies of this scanner passed green in its
 * own repo while missing real defects. A scan that reports zero proves nothing
 * unless the same scanner can be shown to produce a non-zero on a known-bad
 * input. Each block below therefore writes a deliberately defective fixture and
 * asserts the scanner CATCHES it, then asserts the correct form passes.
 */

let root: string;

function write(rel: string, content: string) {
  const full = join(root, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

const BASE = {
  scanRoots: ['src/pages'],
  cardTags: ['Card', 'StatCard', 'SummaryCard'],
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'card-scanner-'));
  mkdirSync(join(root, 'src/pages'), { recursive: true });
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('D-92 — the scanner asserts its inputs before reporting a verdict', () => {
  it('THROWS on a missing scan root instead of reporting a confident zero', () => {
    expect(() =>
      scanCardSurfaces({ ...BASE, projectRoot: root, scanRoots: ['src/does-not-exist'] }),
    ).toThrow(/does not exist/);
  });

  it('THROWS when a scan root matches zero files', () => {
    mkdirSync(join(root, 'src/empty'), { recursive: true });
    expect(() =>
      scanCardSurfaces({ ...BASE, projectRoot: root, scanRoots: ['src/empty'] }),
    ).toThrow(/ZERO files/);
  });

  it('reports HOW it reached its verdict, not only the verdict', () => {
    write('src/pages/ok.tsx', `export const P = () => <CanvasCard cardKey="a"><Card/></CanvasCard>`);
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.summary).toMatch(/scanned \d+ files/);
    expect(r.filesScanned).toBeGreaterThan(0);
  });
});

describe('glued-widget — 2+ cards inside ONE grid slot', () => {
  it('CATCHES two cards packed into one CanvasCard', () => {
    write(
      'src/pages/glued.tsx',
      `export const P = () => (
        <DraggableCardPage pageKey="/x">
          <CanvasCard cardKey="both"><Card>one</Card><Card>two</Card></CanvasCard>
        </DraggableCardPage>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file.endsWith('glued.tsx'));
    expect(f?.idiom).toBe('glued-widget');
    expect(f?.cardCount).toBe(2);
  });

  it('CATCHES the whole page packed into a single widgets.content entry', () => {
    write(
      'src/pages/single-widget.tsx',
      `export const P = () => (
        <PageGridLayout pageKey="/y" widgets={{ content: (<div><Card>a</Card><Card>b</Card></div>) }} />)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file.endsWith('single-widget.tsx'));
    expect(f?.idiom).toBe('glued-widget');
    expect(f?.detail).toContain('widgets.content');
  });

  it('PASSES the correct form — one card per CanvasCard', () => {
    write(
      'src/pages/correct.tsx',
      `export const P = () => (
        <DraggableCardPage pageKey="/z">
          <CanvasCard cardKey="a"><Card>one</Card></CanvasCard>
          <CanvasCard cardKey="b"><Card>two</Card></CanvasCard>
        </DraggableCardPage>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file.endsWith('correct.tsx'))).toBe(false);
  });
});

describe('ungridded-multi-card — the check three of five ports DROPPED', () => {
  it('CATCHES a page with 2+ cards that never reaches a grid primitive', () => {
    write(
      'src/pages/ungridded.tsx',
      `export const P = () => (<div className="space-y-6"><Card>a</Card><Card>b</Card></div>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file.endsWith('ungridded.tsx'));
    expect(f?.idiom).toBe('ungridded-multi-card');
    expect(f?.cardCount).toBe(2);
  });

  it('is NOT fooled by a file that merely MENTIONS a grid primitive in a comment', () => {
    // Three hand-rolled copies gate on a raw substring test over the whole
    // file, so `// TODO: migrate to CanvasCard` marked the page as gridded and
    // skipped it. Comment-stripping is what closes this.
    write(
      'src/pages/comment-masked.tsx',
      `// TODO: migrate this to CanvasCard one day
       export const P = () => (<div><Card>a</Card><Card>b</Card></div>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.file.endsWith('comment-masked.tsx') && x.idiom === 'ungridded-multi-card',
      ),
    ).toBe(true);
  });

  it('does not flag a single card with no grid', () => {
    write('src/pages/one-card.tsx', `export const P = () => (<div><Card>only</Card></div>)`);
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file.endsWith('one-card.tsx'))).toBe(false);
  });
});

describe("conduit's third idiom — a card that is a styled div, not a component", () => {
  it('is INVISIBLE without classSurfaces (reproducing the conduit blind spot)', () => {
    write(
      'src/pages/div-cards.tsx',
      `export const P = () => (<div>
         <section className="rounded-lg border p-4">a</section>
         <section className="rounded-lg border p-4">b</section>
       </div>)`,
    );
    const blind = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(blind.findings.some((x) => x.file.endsWith('div-cards.tsx'))).toBe(false);
  });

  it('is CAUGHT once the class surface is declared', () => {
    const seeing = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      classSurfaces: [/rounded-lg border p-4/],
    });
    const f = seeing.findings.find((x) => x.file.endsWith('div-cards.tsx'));
    expect(f?.idiom).toBe('ungridded-multi-card');
    expect(f?.cardCount).toBe(2);
  });
});

describe('.map() rendering cards', () => {
  it('CATCHES a bare-parameter arrow — the regex shape three copies missed', () => {
    // `.map(item => <Card/>)` with no parens around the param and an
    // expression body evaded `\.map\s*\([^)]*\)\s*=>`.
    write(
      'src/pages/mapped-bare.tsx',
      `export const P = () => (
        <DraggableCardPage pageKey="/m">
          <CanvasCard cardKey="list">{items.map(item => <Card key={item.id}/>)}</CanvasCard>
        </DraggableCardPage>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.find((x) => x.file.endsWith('mapped-bare.tsx'));
    expect(f?.idiom).toBe('glued-widget');
    expect(f?.detail).toContain('.map()');
  });

  it('CATCHES a .map() of CLASS surfaces, not just of card components', () => {
    // Regression: the first version of hasMappedCards built its alternation
    // from cardTags only and ignored classSurfaces, so `.map(api => <div
    // className="glass-card">…)` — N cards in one grid slot — read as clean.
    // This is BSU's Government.tsx#apis shape exactly, and only its
    // hand-maintained ledger knew about it. Found by the BSU lane while
    // consuming this scanner.
    write(
      'src/pages/mapped-class-surface.tsx',
      `export const P = () => (
        <PageGridLayout pageKey="/g" widgets={{
          apis: (<div>{apis.map(api => <div key={api.id} className="glass-card p-4">{api.name}</div>)}</div>)
        }} />)`,
    );
    const blind = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(blind.findings.some((x) => x.file.endsWith('mapped-class-surface.tsx'))).toBe(false);

    const seeing = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      classSurfaces: [/glass-card/],
    });
    const f = seeing.findings.find((x) => x.file.endsWith('mapped-class-surface.tsx'));
    expect(f?.idiom).toBe('glued-widget');
    expect(f?.detail).toContain('.map()');
  });

  it('CATCHES a parenthesised arrow too', () => {
    write(
      'src/pages/mapped-parens.tsx',
      `export const P = () => (
        <DraggableCardPage pageKey="/m2">
          <CanvasCard cardKey="list">{items.map((item) => (<Card key={item.id}/>))}</CanvasCard>
        </DraggableCardPage>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some((x) => x.file.endsWith('mapped-parens.tsx') && x.idiom === 'glued-widget'),
    ).toBe(true);
  });
});

describe('self-closing tag without a space', () => {
  it('CATCHES <Card/> as well as <Card />', () => {
    write(
      'src/pages/selfclosing.tsx',
      `export const P = () => (<div><Card/><Card/></div>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file.endsWith('selfclosing.tsx'))).toBe(true);
  });
});

describe('retired single-widget primitive', () => {
  it('CATCHES the file still existing AND anything still referencing it', () => {
    write('src/components/platform/PageGridPage.tsx', `export const PageGridPage = () => null`);
    write(
      'src/pages/uses-retired.tsx',
      `import { PageGridPage } from '../components/platform/PageGridPage'
       export const P = () => <PageGridPage><Card/></PageGridPage>`,
    );
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      retiredPrimitivePaths: ['src/components/platform/PageGridPage.tsx'],
    });
    const retired = r.findings.filter((x) => x.idiom === 'retired-primitive');
    expect(retired.length).toBeGreaterThanOrEqual(2);
    expect(retired.some((f) => f.file.endsWith('PageGridPage.tsx'))).toBe(true);
    expect(retired.some((f) => f.file.endsWith('uses-retired.tsx'))).toBe(true);
  });
});

describe('exclusion ledgers are claims, not facts', () => {
  it('suppresses an excluded file', () => {
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      gluedExclusions: { 'src/pages/glued.tsx': 'tabs share form state' },
    });
    expect(r.findings.some((x) => x.file.endsWith('glued.tsx'))).toBe(false);
  });

  it('reports a STALE exclusion whose defect no longer exists', () => {
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      gluedExclusions: { 'src/pages/no-longer-glued.tsx': 'fixed long ago' },
    });
    expect(r.staleExclusions).toContain('src/pages/no-longer-glued.tsx');
  });
});

describe('autoHeight policing', () => {
  it('CATCHES an opt-out on an ordinary card', () => {
    write(
      'src/pages/optout.tsx',
      `export const P = () => <CanvasCard cardKey="t" autoHeight={false}><Card/></CanvasCard>`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some((x) => x.file.endsWith('optout.tsx') && x.idiom === 'autoheight-optout'),
    ).toBe(true);
  });

  it('CATCHES the clip invariant: autoHeight={false} with h<=2', () => {
    write(
      'src/pages/clipped.tsx',
      `export const P = () => <CanvasCard cardKey="t" h={2} autoHeight={false}><Card/></CanvasCard>`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some((x) => x.file.endsWith('clipped.tsx') && x.idiom === 'clipped-card'),
    ).toBe(true);
  });

  it('permits the opt-out for a genuinely virtualized list', () => {
    write(
      'src/pages/virtual.tsx',
      `import { VirtualizedList } from '@/components/common/virtualized-list'
       export const P = () => <CanvasCard cardKey="t" autoHeight={false}><VirtualizedList/></CanvasCard>`,
    );
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      autoHeightEscapeHatch: /virtualiz/i,
    });
    expect(
      r.findings.some((x) => x.file.endsWith('virtual.tsx') && x.idiom === 'autoheight-optout'),
    ).toBe(false);
  });
});

describe('stripComments', () => {
  it('removes JSX, block and line comments but not a URL', () => {
    expect(stripComments('{/* <Card/><Card/> */}<Card/>')).toBe('<Card/>');
    expect(stripComments('/* a */b')).toBe('b');
    expect(stripComments('const u = "https://x.dev" // note')).toContain('https://x.dev');
    expect(stripComments('const u = "https://x.dev" // note')).not.toContain('note');
  });

  it('prevents a commented-out example from false-positiving as glue', () => {
    write(
      'src/pages/commented-example.tsx',
      `/* Example: <CanvasCard cardKey="x"><Card/><Card/></CanvasCard> */
       export const P = () => <CanvasCard cardKey="x"><Card/></CanvasCard>`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.findings.some((x) => x.file.endsWith('commented-example.tsx'))).toBe(false);
  });
});
