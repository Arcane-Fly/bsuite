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

/**
 * NOTE on `.find(...)` vs `.filter(x => x.idiom === …)` below.
 *
 * A file can carry MORE THAN ONE idiom, and since V-C5 landed it usually does:
 * two `<Card>`s in one slot are both GLUE (V-C4) and a DOUBLE FRAME (V-C5).
 * Reporting both is correct — suppressing one to keep an old assertion green
 * would hide a real defect — so every assertion here selects the idiom it is
 * actually about. Every app-level consumer already does the same.
 */
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
    const f = r.findings.find(
      (x) => x.file.endsWith('glued.tsx') && x.idiom === 'glued-widget',
    );
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
    const f = r.findings.find(
      (x) => x.file.endsWith('single-widget.tsx') && x.idiom === 'glued-widget',
    );
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
    expect(
      r.findings.some((x) => x.file.endsWith('correct.tsx') && x.idiom === 'glued-widget'),
    ).toBe(false);
    // …and it is STILL a nested-chrome file: one `<Card>` per slot is correct
    // glue-wise and is still a card inside the grid item's card. That is the
    // whole V-C5 finding, and it is why 316 files read clean before tonight.
    expect(
      r.findings.some((x) => x.file.endsWith('correct.tsx') && x.idiom === 'nested-chrome'),
    ).toBe(true);
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
    const f = r.findings.find(
      (x) => x.file.endsWith('mapped-bare.tsx') && x.idiom === 'glued-widget',
    );
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
      `import { PageGridPage } from '../components/platform/PageGridPage.js'
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
    expect(
      r.findings.some((x) => x.file.endsWith('glued.tsx') && x.idiom === 'glued-widget'),
    ).toBe(false);
    // A GLUE waiver is not a CHROME waiver. `nestedChromeExclusions` is a
    // separate ledger on purpose: "these tabs share form state" says nothing
    // about whether the slot paints a second border.
    expect(
      r.findings.some((x) => x.file.endsWith('glued.tsx') && x.idiom === 'nested-chrome'),
    ).toBe(true);
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
    expect(
      r.findings.some(
        (x) => x.file.endsWith('commented-example.tsx') && x.idiom === 'glued-widget',
      ),
    ).toBe(false);
  });
});

/* ==========================================================================
 * V-C5 — NESTED CHROME
 *
 * DEFECT INJECTION, per the doctrine at the head of this file. A detector that
 * reports zero on a known-broken estate is broken itself, so every case below
 * writes a fixture that IS the defect and asserts the scanner catches it, then
 * writes the corrected form and asserts it passes.
 * ========================================================================== */
describe('nested-chrome (V-C5) — a card inside the grid item\'s own card', () => {
  it('CATCHES a Card component inside a CanvasCard (the crm7 shape, 304 files)', () => {
    write(
      'src/pages/nested-component.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a"><Card><div>body</div></Card></CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.filter(
      (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-component.tsx',
    );
    expect(f).toHaveLength(1);
    expect(f[0].detail).toMatch(/paints its own card chrome/);
  });

  it('CATCHES class-declared chrome — border + radius + background on a plain div', () => {
    write(
      'src/pages/nested-class.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a">
          <div className="bg-background p-4 rounded-lg border border-light-border h-full">x</div>
        </CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-class.tsx',
      ),
    ).toBe(true);
  });

  it('CATCHES a COMPOSITE card class — `glass-card rounded-xl` carries border+bg in the class itself', () => {
    // business-suite-unified/src/index.css:760 — `.glass-card` declares
    // background-color AND `border: 1px solid`. A detector demanding three
    // separate Tailwind utilities calls BSU `Government.tsx` clean.
    write(
      'src/pages/nested-composite.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a"><div className="glass-card rounded-xl px-4 py-3">x</div></CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-composite.tsx',
      ),
    ).toBe(true);
  });

  it('CATCHES chrome declared entirely in an inline style object (BSU Settings.tsx shape)', () => {
    write(
      'src/pages/nested-style.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a">
          <div className="rounded-3xl p-4"
            style={{ background: 'var(--bg-shell-elevated)', border: '1px solid var(--border-shell)' }}>x</div>
        </CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-style.tsx',
      ),
    ).toBe(true);
  });

  it('CATCHES nested chrome inside a raw `widgets={{ … }}` slot, not only inside CanvasCard', () => {
    // conduit has ZERO CanvasCard usage and six double-framed grid items. A
    // CanvasCard-only detector is structurally blind to that whole app.
    write(
      'src/pages/nested-widget.tsx',
      `export const P = () => (
        <PageGridLayout pageKey="/x" widgets={{ summary: <Card>a</Card> }} />
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    const f = r.findings.filter(
      (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-widget.tsx',
    );
    expect(f).toHaveLength(1);
    expect(f[0].detail).toMatch(/^widgets\.summary/);
  });

  it('NEGATIVE CONTROL: a bare child in a CanvasCard is clean — the fixture the detector must NOT flag', () => {
    write(
      'src/pages/clean-bare.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a"><div className="flex flex-col gap-2"><h2>Title</h2></div></CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some((x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/clean-bare.tsx'),
    ).toBe(false);
  });

  it('NEGATIVE CONTROL: a bordered, rounded, tinted BUTTON is a button, not a second card', () => {
    // throughput Teams.tsx: a filter control carrying border+rounded+bg. Chrome
    // on a control is never the double-frame defect. Excluded by TAG, not by
    // tuning the class thresholds until the number looked right.
    write(
      'src/pages/clean-control.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a">
          <button className="bg-muted border border-border-interactive rounded-lg px-4 py-2">Filter</button>
        </CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/clean-control.tsx',
      ),
    ).toBe(false);
  });

  it('NEGATIVE CONTROL: two of the three chrome signals is a tinted panel, not a card', () => {
    write(
      'src/pages/clean-two-of-three.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a"><div className="rounded-lg bg-muted p-3">note</div></CanvasCard>
      )`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/clean-two-of-three.tsx',
      ),
    ).toBe(false);
  });

  it('reports ONE finding per file, so the count is a FILE count and not an occurrence count', () => {
    write(
      'src/pages/nested-many.tsx',
      `export const P = () => (<>
        <CanvasCard cardKey="a"><Card>1</Card></CanvasCard>
        <CanvasCard cardKey="b"><Card>2</Card></CanvasCard>
        <CanvasCard cardKey="c"><Card>3</Card></CanvasCard>
      </>)`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.filter(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/nested-many.tsx',
      ),
    ).toHaveLength(1);
    expect(r.nestedChromeFiles).toContain('src/pages/nested-many.tsx');
  });
});

describe('D-92 — "checked nothing" and "found nothing" do not share an exit code', () => {
  it('marks a file it cannot parse UNKNOWN, and does NOT report it clean', () => {
    write(
      'src/pages/unparseable.tsx',
      `export const P = () => (
        <CanvasCard cardKey="a"><Card>only an opening tag, no close`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(r.unknownFiles).toContain('src/pages/unparseable.tsx');
    expect(
      r.findings.some(
        (x) => x.idiom === 'unparseable' && x.file === 'src/pages/unparseable.tsx',
      ),
    ).toBe(true);
    expect(r.summary).toMatch(/UNKNOWN file\(s\)/);
  });

  it('a clean tree reports ZERO unknowns — the UNKNOWN channel is not always-on noise', () => {
    const solo = mkdtempSync(join(tmpdir(), 'card-scanner-solo-'));
    mkdirSync(join(solo, 'src/pages'), { recursive: true });
    writeFileSync(
      join(solo, 'src/pages/fine.tsx'),
      `export const P = () => <CanvasCard cardKey="a"><h2>Title</h2></CanvasCard>`,
    );
    const r = scanCardSurfaces({ ...BASE, projectRoot: solo });
    expect(r.unknownFiles).toEqual([]);
    expect(r.nestedChromeFiles).toEqual([]);
    rmSync(solo, { recursive: true, force: true });
  });
});

describe('stripComments must not delete real code', () => {
  it('does NOT swallow the file from a block comment at the head of an object literal to the next `*/}`', () => {
    // crm7 src/pages/people/new/worker.tsx lost 37 lines and two <CanvasCard>
    // blocks to the lazy `{...*​/}` form, which then read as clean.
    const src = [
      'const cfg = {',
      '  /* an ordinary block comment, NOT a JSX comment container */',
      '  a: 1,',
      '}',
      'const El = () => (<CanvasCard cardKey="x"><Card>kept</Card></CanvasCard>)',
      'const J = () => (<div>{/* a real JSX comment */}</div>)',
    ].join('\n');
    const out = stripComments(src);
    expect(out).toContain('<CanvasCard cardKey="x">');
    expect(out).toContain('<Card>kept</Card>');
    expect(out).not.toContain('ordinary block comment');
    expect(out).not.toContain('a real JSX comment');
  });
});

describe('the detector survives the inversion it was built to justify', () => {
  it('post-2.0.0 (`gridItemPaintsChrome: false`), a nested card is the CORRECT shape and is not flagged', () => {
    // Once the grid item stops painting chrome, the app's own card is the only
    // surface. A detector that kept flagging those 332 files would fail forever
    // on code that is now right — and would be switched off, which is how gates
    // die.
    write(
      'src/pages/post-inversion.tsx',
      `export const P = () => <CanvasCard cardKey="a"><Card>body</Card></CanvasCard>`,
    );
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      gridItemPaintsChrome: false,
    });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/post-inversion.tsx',
      ),
    ).toBe(false);
  });

  it('post-2.0.0, a slot that opts BACK INTO chrome and still nests a card IS the defect', () => {
    write(
      'src/pages/re-chromed.tsx',
      `export const P = () => <CanvasCard cardKey="a" chrome><Card>body</Card></CanvasCard>`,
    );
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      gridItemPaintsChrome: false,
    });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/re-chromed.tsx',
      ),
    ).toBe(true);
  });

  it('post-2.0.0, an app-level `itemChrome` re-chromes every slot in the file', () => {
    write(
      'src/pages/app-chromed.tsx',
      `export const P = () => (
        <PageGridLayout pageKey="/x" itemChrome widgets={{ a: <Card>body</Card> }} />
      )`,
    );
    const r = scanCardSurfaces({
      ...BASE,
      projectRoot: root,
      gridItemPaintsChrome: false,
    });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/app-chromed.tsx',
      ),
    ).toBe(true);
  });

  it('DEFAULTS to the pre-inversion package — an app must DECLARE which side it is on', () => {
    // conduit sat on a minor-locked `^0.6.3` while the fix shipped in 0.8.0 and
    // nothing reported it. An optimistic default would repeat that exactly.
    const r = scanCardSurfaces({ ...BASE, projectRoot: root });
    expect(
      r.findings.some(
        (x) => x.idiom === 'nested-chrome' && x.file === 'src/pages/post-inversion.tsx',
      ),
    ).toBe(true);
  });
});
