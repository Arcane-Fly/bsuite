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
  | 'clipped-card'
  /**
   * V-C5. A grid item whose child re-declares card chrome — border + radius +
   * background — inside the chrome the grid item already paints. 28px inside
   * 24px, two 1px borders. This is the idiom V-C4 (`glued-widget`) cannot see:
   * ONE card in ONE slot is not glue, and it is still a double frame.
   */
  | 'nested-chrome'
  /**
   * The file could not be parsed with confidence. NOT a clean verdict. A gate
   * that cannot tell "checked nothing" from "found nothing" is not a gate
   * (D-92), so an unparseable file gets its own idiom and its own exit path.
   */
  | 'unparseable';

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
  /**
   * Extra component names that count as CARD CHROME when they appear inside a
   * grid slot — a component that paints its own border + radius + background.
   * `cardTags` is always included; this is for app-local chrome components the
   * glue check does not need (BSU `MagicCard`, conduit `CounterCard`, …).
   */
  nestedChromeTags?: string[];
  /** file -> reason. A nested-chrome file listed here is allowed. */
  nestedChromeExclusions?: Record<string, string>;
}

export interface CardSurfaceScanResult {
  findings: CardSurfaceFinding[];
  /** Files actually read. If this is 0 the scan proved nothing. */
  filesScanned: number;
  scanRootsResolved: string[];
  /** Exclusion-ledger keys that no longer match any finding — stale entries. */
  staleExclusions: string[];
  /**
   * Files the scanner could NOT parse with confidence. These are UNKNOWN, not
   * clean. A caller that treats an empty `findings` array as a pass while this
   * array is non-empty has reproduced the exact defect D-92 names.
   */
  unknownFiles: string[];
  /** Distinct files carrying at least one `nested-chrome` finding. */
  nestedChromeFiles: string[];
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
    // {/* JSX comment */} — TEMPERED so the match cannot span a `*​/` it did
    // not open. The naive lazy form `\{\s*\/\*[\s\S]*?\*\/\s*\}` backtracks
    // past the comment's own terminator whenever the next character is not
    // `}` — e.g. an ordinary block comment sitting at the head of an object
    // literal — and then matches the NEXT `*​/}` anywhere later in the file,
    // DELETING every line between. crm7 `src/pages/people/new/worker.tsx` lost
    // 37 lines and two whole `<CanvasCard>` blocks to exactly that, which the
    // UNKNOWN gate below caught as unbalanced tags. Code silently deleted
    // before matching is a scanner that under-reports and calls it clean.
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, '')
    .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, '') // /* block */
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

/* ==========================================================================
 * V-C5 — NESTED CHROME
 *
 * `PageGridLayout` paints EVERY grid item as a card:
 *
 *   h-full w-full rounded-3xl transition-all flex flex-col
 *   bg-card border border-border shadow-sm dark:shadow-[var(--glow-card,none)]
 *
 * When the slot's own content re-declares that surface — border + radius +
 * background — the user sees 28px inside 24px and two 1px borders. V-C4
 * (`glued-widget`) cannot see this: ONE card in ONE slot is not glue, and it
 * is still a double frame. That is why 316 files across the estate render a
 * card inside a card and every existing gate reads green.
 * ========================================================================== */

/** Components that paint their own card chrome. */
const DEFAULT_NESTED_CHROME_TAGS = [
  'Card',
  'MagicCard',
  'GlassCard',
  'NeonCard',
  'StatCard',
  'SummaryCard',
  'ServiceCard',
  'CounterCard',
  'MetricCard',
  'InfoCard',
];

/**
 * Elements that are CONTROLS, not surfaces.
 *
 * A bordered, rounded, tinted `<button>` is a button. A `<Badge>` is a pill.
 * Counting them as nested chrome is how a detector inflates: throughput's
 * `Teams.tsx` carries `border … rounded … text-…` on a filter button, which is
 * correct styling and not a second card. Chrome on a control is never the
 * double-frame defect, so controls are excluded BY TAG rather than by tuning
 * the class thresholds until the number looks right.
 */
const CONTROL_TAGS = new Set([
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'Button',
  'Input',
  'Select',
  'SelectTrigger',
  'SelectContent',
  'Textarea',
  'Badge',
  'Avatar',
  'AvatarFallback',
  'Switch',
  'Checkbox',
  'Progress',
  'Slider',
  'Toggle',
  'ToggleGroup',
  'ToggleGroupItem',
  'TabsList',
  'TabsTrigger',
  'Skeleton',
  'Tooltip',
  'TooltipContent',
  'DropdownMenuContent',
  'PopoverContent',
]);

const RADIUS_CLASS = /(?:^|[\s'"`])rounded(?:-[a-z0-9[\]().\-/]+)?(?=$|[\s'"`])/;
const BORDER_CLASS = /(?:^|[\s'"`])border(?:-[a-z0-9[\]().\-/]+)?(?=$|[\s'"`])/;
const BG_CLASS =
  /(?:^|[\s'"`])(?:bg-[a-z0-9[\]().\-/]+|glass-card|neon-card|card-surface)(?=$|[\s'"`])/;

/**
 * Composite classes that are a WHOLE card surface on their own.
 *
 * BSU's `.glass-card` (business-suite-unified/src/index.css:760) declares
 * `background-color` AND `border: 1px solid` AND a shadow. `glass-card
 * rounded-xl` is therefore already border + radius + background — the full
 * double frame — while carrying no `border-*` utility for a class matcher to
 * find. Requiring three separate Tailwind utilities makes every composite-class
 * card invisible; BSU `Government.tsx` is exactly that shape.
 */
const COMPOSITE_CARD_CLASS = /(?:^|[\s'"`])(?:glass-card|neon-card|card-surface)(?=$|[\s'"`])/;

const RADIUS_STYLE = /\bborder-?[Rr]adius\b/;
const BORDER_STYLE = /\bborder(?:Color|Width|Style)?\s*:/;
const BG_STYLE = /\b(?:background|backgroundColor|backgroundImage)\s*:/;

/**
 * Every opening tag in a JSX body, with its raw attribute text.
 *
 * Hand-rolled rather than regex-only because an attribute value can contain
 * `>` inside a string, a template literal or a `{…}` expression — three of the
 * five hand-rolled copies this module replaced were defeated by exactly that.
 */
export function openingTags(body: string): { tag: string; attrs: string }[] {
  const out: { tag: string; attrs: string }[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '<') continue;
    const nameMatch = /^<([A-Za-z][A-Za-z0-9._-]*)/.exec(body.slice(i, i + 64));
    if (!nameMatch) continue;
    let j = i + nameMatch[0].length;
    let depth = 0;
    let quote: string | null = null;
    let closed = false;
    for (; j < body.length; j++) {
      const c = body[j];
      if (quote) {
        if (c === quote && body[j - 1] !== '\\') quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        quote = c;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) {
        closed = true;
        break;
      }
    }
    if (!closed) continue;
    out.push({ tag: nameMatch[1], attrs: body.slice(i + nameMatch[0].length, j) });
    i = j;
  }
  return out;
}

/** Every className value on one element — string, template literal or `cn(...)`. */
function classValues(attrs: string): string[] {
  const out: string[] = [];
  const re = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*)\})/;
  const m = re.exec(attrs);
  if (!m) return out;
  if (m[1] !== undefined) out.push(m[1]);
  else if (m[2] !== undefined) out.push(m[2]);
  else if (m[3] !== undefined) {
    // `{cn('a', cond && 'b')}` / `{`a ${x}`}` — take every literal inside.
    const lit = /(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    let l: RegExpExecArray | null;
    while ((l = lit.exec(m[3])) !== null) out.push(l[1] ?? l[2] ?? l[3] ?? '');
  }
  return out;
}

/** The raw text of an inline `style={{ … }}` attribute, if present. */
function styleValue(attrs: string): string | null {
  const i = attrs.indexOf('style');
  if (i < 0) return null;
  const m = /style\s*=\s*\{/.exec(attrs.slice(i));
  if (!m) return null;
  let depth = 0;
  const start = i + m.index + m[0].length - 1;
  for (let j = start; j < attrs.length; j++) {
    if (attrs[j] === '{') depth++;
    else if (attrs[j] === '}') {
      depth--;
      if (depth === 0) return attrs.slice(start, j + 1);
    }
  }
  return null;
}

/**
 * Does this element paint its OWN card chrome?
 *
 * Chrome means all three of border, radius and background, because that is
 * exactly what `PageGridLayout` already paints on the slot. Two of the three is
 * a tinted panel or a divider, not a second card — requiring all three is what
 * separates BSU's `glass-card rounded-2xl border-primary/30` (a real double
 * frame) from a `rounded-lg bg-muted` inline chip (not one).
 *
 * Chrome declared through `style={{ background, border, borderRadius }}` counts
 * the same as chrome declared through classes. BSU's `Settings.tsx` is chrome
 * entirely in inline style; a class-only detector calls that file clean, which
 * is how a nested card hides from a gate that only reads Tailwind.
 */
export function elementDeclaresCardChrome(
  el: { tag: string; attrs: string },
  chromeTags: Set<string>,
): string | null {
  if (chromeTags.has(el.tag)) return `<${el.tag}> paints its own card chrome`;
  if (CONTROL_TAGS.has(el.tag)) return null;

  for (const value of classValues(el.attrs)) {
    const composite = COMPOSITE_CARD_CLASS.test(value);
    const hasBorder = composite || BORDER_CLASS.test(value);
    const hasBg = composite || BG_CLASS.test(value);
    if (RADIUS_CLASS.test(value) && hasBorder && hasBg)
      return `<${el.tag}> className declares border + radius + background ("${value.replace(/\s+/g, ' ').trim().slice(0, 80)}")`;
  }

  const style = styleValue(el.attrs);
  if (style && RADIUS_STYLE.test(style) && BORDER_STYLE.test(style) && BG_STYLE.test(style))
    return `<${el.tag}> inline style declares border + radius + background`;

  // Mixed: radius as a class, border+background as inline style. BSU
  // `Settings.tsx` is exactly this shape.
  if (style) {
    const classText = classValues(el.attrs).join(' ');
    const composite = COMPOSITE_CARD_CLASS.test(classText);
    const hasRadius = RADIUS_CLASS.test(classText) || RADIUS_STYLE.test(style);
    const hasBorder = composite || BORDER_CLASS.test(classText) || BORDER_STYLE.test(style);
    const hasBg = composite || BG_CLASS.test(classText) || BG_STYLE.test(style);
    if (hasRadius && hasBorder && hasBg)
      return `<${el.tag}> declares border + radius + background across className and inline style`;
  }
  return null;
}

/** The first nested-chrome element inside one grid slot, or null. */
export function findNestedChrome(
  slotBody: string,
  config: Pick<CardSurfaceScannerConfig, 'cardTags' | 'nestedChromeTags'>,
): string | null {
  const chromeTags = new Set([
    ...config.cardTags,
    ...(config.nestedChromeTags ?? DEFAULT_NESTED_CHROME_TAGS),
  ]);
  // Skip the slot's own opening tag — `<CanvasCard>` is the grid item, not a
  // child of it.
  const inner = slotBody.replace(/^<CanvasCard[\s\S]*?>/, '');
  for (const el of openingTags(inner)) {
    const hit = elementDeclaresCardChrome(el, chromeTags);
    if (hit) return hit;
  }
  return null;
}

/**
 * Can this file be parsed with confidence?
 *
 * Returns a reason when it CANNOT. Every `<CanvasCard` must pair with a
 * `</CanvasCard>` the block regex can reach, and every `widgets={{` must close
 * before EOF. A file that fails either is UNKNOWN — it is not reported clean,
 * and it is not silently skipped. "Checked nothing" and "found nothing" do not
 * share an exit code here.
 */
export function parseConfidence(src: string): string | null {
  const opens = (src.match(/<CanvasCard[\s/>]/g) ?? []).length;
  const selfClosing = (src.match(/<CanvasCard[^<>]*\/>/g) ?? []).length;
  const closes = (src.match(/<\/CanvasCard>/g) ?? []).length;
  if (opens - selfClosing !== closes)
    return `unbalanced CanvasCard tags: ${opens} opening (${selfClosing} self-closing) vs ${closes} closing`;
  const blocks = extractCanvasCardBlocks(src).length;
  if (blocks !== closes)
    return `CanvasCard block extraction recovered ${blocks} of ${closes} blocks (nested or dynamically composed CanvasCards)`;

  const widgetStarts = (src.match(/widgets=\{\{/g) ?? []).length;
  if (widgetStarts > 0) {
    const re = /widgets=\{\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      let depth = 2;
      let i = m.index + m[0].length;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      if (depth !== 0) return 'widgets={{ … }} object literal never closes before EOF';
    }
  }
  return null;
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
  const unknownFiles: string[] = [];

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
    let raw: string;
    try {
      raw = readFileSync(file, 'utf8');
    } catch (err) {
      // A file we could not READ is UNKNOWN, never clean.
      unknownFiles.push(rel);
      findings.push({
        file: rel,
        idiom: 'unparseable',
        detail: `could not be read: ${(err as Error).message}`,
      });
      continue;
    }
    const src = stripComments(raw);

    // D-92 fail-closed: decide whether this file can be parsed with confidence
    // BEFORE reporting any verdict about it. An UNKNOWN file is recorded as
    // UNKNOWN and still scanned on a best-effort basis — what it must never do
    // is contribute a silent "clean".
    const unparseable = parseConfidence(src);
    if (unparseable) {
      unknownFiles.push(rel);
      findings.push({ file: rel, idiom: 'unparseable', detail: unparseable });
    }

    // --- glued widget: 2+ cards inside ONE grid slot -----------------------
    const slots: { label: string; body: string }[] = [
      ...extractCanvasCardBlocks(src).map((b, i) => ({ label: `CanvasCard#${i + 1}`, body: b })),
      ...extractWidgetEntries(src).map((e) => ({ label: `widgets.${e.key}`, body: e.body })),
    ];
    let nestedChromeReported = false;
    for (const slot of slots) {
      // --- V-C5 nested chrome: ONE card inside ONE slot is still a double
      // frame, and V-C4 below cannot see it (it needs 2+).
      if (!nestedChromeReported && !config.nestedChromeExclusions?.[rel]) {
        const chrome = findNestedChrome(slot.body, config);
        if (chrome) {
          nestedChromeReported = true;
          findings.push({
            file: rel,
            idiom: 'nested-chrome',
            detail:
              `${slot.label} ${chrome}. The grid item already paints ` +
              `rounded-3xl + bg-card + border-border, so this renders a card inside a card — ` +
              `mismatched corners and a doubled 1px edge.`,
          });
        }
      }

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
  const nestedChromeFiles = [
    ...new Set(findings.filter((f) => f.idiom === 'nested-chrome').map((f) => f.file)),
  ];

  const summary =
    `scanned ${files.length} files across ${scanRootsResolved.length} root(s) [${scanRootsResolved.join(', ')}] ` +
    `with cardTags [${config.cardTags.join(', ')}]` +
    `${config.classSurfaces?.length ? ` + ${config.classSurfaces.length} class surface pattern(s)` : ''}; ` +
    `${findings.length} finding(s) incl. ${nestedChromeFiles.length} nested-chrome file(s); ` +
    `${Object.keys(config.blindSpots ?? {}).length} declared blind spot(s); ` +
    `${staleExclusions.length} stale exclusion(s); ` +
    `${unknownFiles.length} UNKNOWN file(s) — an UNKNOWN is not a clean file.`;

  return {
    findings,
    filesScanned: files.length,
    scanRootsResolved,
    staleExclusions,
    unknownFiles,
    nestedChromeFiles,
    summary,
  };
}
