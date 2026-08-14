/**
 * The card-surface contract scanner — ONE implementation, shipped from the
 * package, replacing five divergent hand-rolled copies.
 *
 * Why this exists
 * ---------------
 * crm7 wrote a card-unglue contract test. BSU, conduit, throughput and braden
 * each PORTED it, and each silently dropped checks during the port. The
 * divergence was not cosmetic:
 *
 *   - `findUngriddedMultiCard` — the check crm7's own comment calls "the actual
 *     root cause of the operator's platform-wide complaint" — was ABSENT from
 *     BSU, throughput and braden, and present only in a narrowed form in
 *     conduit. In throughput and braden it was absent structurally: their glue
 *     scan is gated on the file containing `CanvasCard` at all, so a page with
 *     two cards and no grid primitive is invisible by construction.
 *   - conduit's header documents THREE card idioms and its regexes detect TWO.
 *     The third (`rounded-lg border p-4` section panels) has no detector, which
 *     is how five known-glued conduit pages pass as an empty ledger.
 *   - BSU's scan only walks files containing the literal string
 *     `PageGridLayout`, so every BSU page that never adopted the grid is
 *     structurally invisible to BSU's own gate.
 *
 * A gate that cannot tell "checked nothing" from "found nothing" is not a gate
 * (D-92). This module therefore ASSERTS ITS INPUTS: it fails closed if a scan
 * root is missing or matches zero files, and it reports how it reached its
 * verdict rather than only the verdict.
 *
 * What stays per-app
 * ------------------
 * Scan roots, card vocabulary, class-based surface patterns, and the exclusion
 * ledgers. Those are operational truth about a specific app. Everything else —
 * the detection logic — lives here so it can only be fixed once.
 *
 * Node-only: this module touches the filesystem and is exported from
 * `@bsuite/page-builder/scanner`, NOT from the package root, so it never
 * reaches a browser bundle.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export type CardSurfaceIdiom =
  /** 2+ card-like components packed inside ONE grid slot. */
  | 'glued-widget'
  /** 2+ card-like components on a page that never reaches a grid primitive. */
  | 'ungridded-multi-card'
  /** A retired single-widget primitive still present or still imported. */
  | 'retired-primitive'
  /** autoHeight opt-out on a card that is not a virtualized list. */
  | 'autoheight-optout'
  /** autoHeight={false} with a seed height so small the card must clip. */
  | 'clipped-card';

export interface CardSurfaceFinding {
  file: string;
  idiom: CardSurfaceIdiom;
  detail: string;
  /** Number of card-like components involved, where meaningful. */
  cardCount?: number;
}

export interface CardSurfaceScannerConfig {
  /** Absolute path to the repo root. */
  projectRoot: string;
  /**
   * Directories to walk, repo-relative. Every one MUST exist and MUST contain
   * at least one scannable file, or the scan fails closed.
   */
  scanRoots: string[];
  /**
   * Component names that count as a card. Apps differ materially here: crm7
   * uses `Card`/`StatCard`/`SummaryCard`, BSU adds `ServiceCard`, conduit uses
   * `SummaryCard`/`CounterCard`.
   */
  cardTags: string[];
  /**
   * Class-based card surfaces — a card that is a styled `div`, not a
   * component. This is the idiom conduit documented and never implemented, and
   * the one BSU's `glass-card` tiles use. Supply e.g.
   * `[/glass-card/, /rounded-lg border p-4/]`.
   */
  classSurfaces?: RegExp[];
  /** Identifiers that prove a file reached the grid. */
  gridPrimitives?: string[];
  /** Repo-relative path of a retired single-widget primitive that must not exist. */
  retiredPrimitivePaths?: string[];
  /** file -> reason. A glued widget listed here is allowed. */
  gluedExclusions?: Record<string, string>;
  /** file -> reason. An ungridded multi-card page listed here is allowed. */
  ungriddedExclusions?: Record<string, string>;
  /**
   * Directories deliberately NOT scanned, each with a reason. Declaring a
   * blind spot is required; having an undeclared one is the defect.
   */
  blindSpots?: Record<string, string>;
  /**
   * If a file matches this, an `autoHeight={false}` in it is permitted — the
   * opt-out is reserved for genuinely virtualized/windowed lists.
   */
  autoHeightEscapeHatch?: RegExp;
  /** File extensions to scan. Defaults to .tsx. */
  extensions?: string[];
}

export interface CardSurfaceScanResult {
  findings: CardSurfaceFinding[];
  /** Files actually read. If this is 0 the scan proved nothing. */
  filesScanned: number;
  scanRootsResolved: string[];
  /** Exclusion-ledger keys that no longer match any finding — stale entries. */
  staleExclusions: string[];
  /** Human-readable account of how the verdict was reached. */
  summary: string;
}

const DEFAULT_GRID_PRIMITIVES = [
  'CanvasCard',
  'DraggableCardPage',
  'PageGridLayout',
  'usePageGridLayout',
];

/**
 * Strip block comments, line comments and JSX comments before matching.
 *
 * Three of the five hand-rolled copies matched against raw file content, which
 * produced two opposite errors at once: a commented-out `<Card/><Card/>`
 * example false-POSITIVES as glue, and a file that merely MENTIONS
 * `CanvasCard` in a TODO comment false-NEGATIVES as "already gridded" and is
 * skipped entirely. Stripping first fixes both.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // {/* JSX comment */}
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* block */
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // // line, but not http://
}

function tagPattern(tags: string[]): RegExp {
  // `[\s/>]` not `[\s>]`: `<Card/>` with no space before the slash was missed
  // by three of the five copies. The trailing alternation keeps `<Card>` and
  // `<Card ...>` matching too.
  return new RegExp(`<(${tags.join('|')})[\\s/>]`, 'g');
}

function countCardTags(source: string, config: CardSurfaceScannerConfig): number {
  let count = (source.match(tagPattern(config.cardTags)) ?? []).length;
  for (const re of config.classSurfaces ?? []) {
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    count += (source.match(global) ?? []).length;
  }
  return count;
}

/**
 * Does this source render cards from a `.map()`?
 *
 * The non-greedy `[\s\S]*?` form is deliberate. Three copies used
 * `\.map\s*\([^)]*\)\s*=>` which requires a PARENTHESISED parameter, so
 * `items.map(item => <Card/>)` — a bare param with an expression body — was
 * missed. That gap is currently dormant across the estate but it is a landmine,
 * not a theoretical concern.
 */
function hasMappedCards(source: string, config: CardSurfaceScannerConfig): boolean {
  const tags = config.cardTags.join('|');
  if (
    new RegExp(`\\.map\\s*\\([\\s\\S]*?=>\\s*\\(?\\s*<(${tags})[\\s/>]`).test(source) ||
    new RegExp(`\\.map\\s*\\([\\s\\S]*?\\{[\\s\\S]*?return\\s*\\(?\\s*<(${tags})[\\s/>]`).test(
      source,
    )
  )
    return true;

  // A mapped CLASS surface is still a mapped card.
  //
  // This was missed on the first pass: the tag alternation above is built from
  // `cardTags` only, so `.map(api => <div className="glass-card">…)` produced N
  // cards inside one grid slot and read as clean. BSU's `Government.tsx#apis`
  // is exactly that shape, and only its hand-maintained ledger knew — which is
  // the failure mode this whole module exists to end. `countCardTags` already
  // counts class surfaces; the mapped check has to as well or the two disagree.
  for (const re of config.classSurfaces ?? []) {
    const src = re.source;
    if (
      new RegExp(`\\.map\\s*\\([\\s\\S]*?=>\\s*\\(?\\s*<[^>]*?${src}`).test(source) ||
      new RegExp(`\\.map\\s*\\([\\s\\S]*?\\{[\\s\\S]*?return\\s*\\(?\\s*<[^>]*?${src}`).test(
        source,
      )
    )
      return true;
  }
  return false;
}

/** Extract the body of every `<CanvasCard …> … </CanvasCard>` block. */
function extractCanvasCardBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /<CanvasCard[\s>][\s\S]*?<\/CanvasCard>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) blocks.push(m[0]);
  return blocks;
}

/**
 * Extract each value of an inline `widgets={{ key: <jsx/> }}` object literal.
 * Brace-balanced rather than regex-terminated, because a widget body contains
 * arbitrary nested JSX and braces.
 */
function extractWidgetEntries(source: string): { key: string; body: string }[] {
  const out: { key: string; body: string }[] = [];
  const start = /widgets=\{\{/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(source)) !== null) {
    let depth = 2;
    let i = m.index + m[0].length;
    const objStart = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    const obj = source.slice(objStart, i - 2);
    // Split top-level `key:` entries at depth 0.
    let d = 0;
    let keyStart = 0;
    let currentKey: string | null = null;
    let bodyStart = 0;
    for (let j = 0; j < obj.length; j++) {
      const c = obj[j];
      if (c === '{' || c === '(' || c === '[') d++;
      else if (c === '}' || c === ')' || c === ']') d--;
      else if (c === ':' && d === 0 && currentKey === null) {
        currentKey = obj.slice(keyStart, j).trim().replace(/['"]/g, '');
        bodyStart = j + 1;
      } else if (c === ',' && d === 0 && currentKey !== null) {
        out.push({ key: currentKey, body: obj.slice(bodyStart, j) });
        currentKey = null;
        keyStart = j + 1;
      }
    }
    if (currentKey !== null) out.push({ key: currentKey, body: obj.slice(bodyStart) });
  }
  return out;
}

function walk(dir: string, extensions: string[], acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, extensions, acc);
    else if (extensions.some((e) => entry.endsWith(e)) && !/\.(test|spec)\./.test(entry))
      acc.push(full);
  }
}

export function scanCardSurfaces(
  config: CardSurfaceScannerConfig,
): CardSurfaceScanResult {
  const extensions = config.extensions ?? ['.tsx'];
  const gridPrimitives = config.gridPrimitives ?? DEFAULT_GRID_PRIMITIVES;
  const findings: CardSurfaceFinding[] = [];
  const files: string[] = [];
  const scanRootsResolved: string[] = [];

  // D-92: assert the inputs were present BEFORE reporting any verdict. A
  // missing scan root must fail loudly, not produce a confident zero.
  for (const root of config.scanRoots) {
    const abs = join(config.projectRoot, root);
    if (!existsSync(abs))
      throw new Error(
        `[cardSurfaceScanner] scan root "${root}" does not exist at ${abs}. ` +
          `A scanner that silently skips a missing root reports a false pass, which is worse than a failure.`,
      );
    const before = files.length;
    walk(abs, extensions, files);
    if (files.length === before)
      throw new Error(
        `[cardSurfaceScanner] scan root "${root}" matched ZERO files with extensions ${extensions.join(', ')}. ` +
          `Refusing to report a verdict from an empty scan.`,
      );
    scanRootsResolved.push(root);
  }

  // Retired single-widget primitives must not exist and must not be imported.
  for (const retired of config.retiredPrimitivePaths ?? []) {
    const abs = join(config.projectRoot, retired);
    if (existsSync(abs))
      findings.push({
        file: retired,
        idiom: 'retired-primitive',
        detail:
          `${retired} still exists. It builds ONE grid item for the whole page, so every card on it ` +
          `moves as a single block — the exact defect this contract exists to prevent.`,
      });
    const base = retired.split(sep).pop()?.replace(/\.tsx?$/, '');
    if (base) {
      for (const file of files) {
        const src = stripComments(readFileSync(file, 'utf8'));
        if (new RegExp(`\\b${base}\\b`).test(src) && !file.endsWith(retired))
          findings.push({
            file: relative(config.projectRoot, file),
            idiom: 'retired-primitive',
            detail: `imports or references the retired primitive ${base}`,
          });
      }
    }
  }

  for (const file of files) {
    const rel = relative(config.projectRoot, file);
    const raw = readFileSync(file, 'utf8');
    const src = stripComments(raw);

    // --- glued widget: 2+ cards inside ONE grid slot -----------------------
    const slots: { label: string; body: string }[] = [
      ...extractCanvasCardBlocks(src).map((b, i) => ({ label: `CanvasCard#${i + 1}`, body: b })),
      ...extractWidgetEntries(src).map((e) => ({ label: `widgets.${e.key}`, body: e.body })),
    ];
    for (const slot of slots) {
      const n = countCardTags(slot.body, config);
      const mapped = hasMappedCards(slot.body, config);
      if (n > 1 || mapped) {
        if (config.gluedExclusions?.[rel]) continue;
        findings.push({
          file: rel,
          idiom: 'glued-widget',
          cardCount: n,
          detail:
            `${slot.label} packs ${mapped ? 'a .map() of cards' : `${n} card-like components`} into one grid slot. ` +
            `Dragging any one of them moves them all.`,
        });
      }
    }

    // --- ungridded multi-card: the check three of five ports DROPPED -------
    // Gate on the COMMENT-STRIPPED source so a TODO mentioning CanvasCard does
    // not mask a page that never actually reaches the grid.
    const usesGrid = gridPrimitives.some((p) => new RegExp(`\\b${p}\\b`).test(src));
    if (!usesGrid) {
      const n = countCardTags(src, config);
      if (n > 1 && !config.ungriddedExclusions?.[rel]) {
        findings.push({
          file: rel,
          idiom: 'ungridded-multi-card',
          cardCount: n,
          detail:
            `renders ${n} card-like surfaces and never reaches a grid primitive, so none of them is draggable at all. ` +
            `This is the idiom crm7's scanner calls "the actual root cause of the operator's platform-wide complaint".`,
        });
      }
    }

    // --- autoHeight opt-out + clip invariant -------------------------------
    const optOut = /autoHeight\s*[:=]\s*\{?\s*false/g;
    if (optOut.test(src) && !(config.autoHeightEscapeHatch?.test(src) ?? false)) {
      findings.push({
        file: rel,
        idiom: 'autoheight-optout',
        detail:
          `opts out of autoHeight. That is reserved for genuinely virtualized/windowed lists that own their own scroll; ` +
          `an ordinary table must expand so every row is visible.`,
      });
    }
    // A card that opts out AND seeds h<=2 (64px) cannot show its content.
    if (/autoHeight\s*[:=]\s*\{?\s*false/.test(src) && /\bh=\{?[12]\}?/.test(src)) {
      findings.push({
        file: rel,
        idiom: 'clipped-card',
        detail: `autoHeight={false} with h<=2 (<=64px) — the card is guaranteed to clip its content.`,
      });
    }
  }

  // Stale ledger entries: a claim that is no longer true is a claim that will
  // be trusted next time. An exclusions ledger is a claim, not a fact.
  const hit = new Set(findings.map((f) => `${f.idiom}:${f.file}`));
  const staleExclusions = [
    ...Object.keys(config.gluedExclusions ?? {}).filter(
      (f) => !hit.has(`glued-widget:${f}`) && !hit.has(`autoheight-optout:${f}`),
    ),
    ...Object.keys(config.ungriddedExclusions ?? {}).filter(
      (f) => !hit.has(`ungridded-multi-card:${f}`),
    ),
  ];

  const summary =
    `scanned ${files.length} files across ${scanRootsResolved.length} root(s) [${scanRootsResolved.join(', ')}] ` +
    `with cardTags [${config.cardTags.join(', ')}]` +
    `${config.classSurfaces?.length ? ` + ${config.classSurfaces.length} class surface pattern(s)` : ''}; ` +
    `${findings.length} finding(s); ${Object.keys(config.blindSpots ?? {}).length} declared blind spot(s); ` +
    `${staleExclusions.length} stale exclusion(s).`;

  return { findings, filesScanned: files.length, scanRootsResolved, staleExclusions, summary };
}
