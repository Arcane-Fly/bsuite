/**
 * Which headings are CARD headings, and do they carry the gradient?
 *
 * WHY THIS EXISTS. The estate's heading gradient was implemented as a
 * PAGE-TITLE convention and shipped: 183 of 232 crm7 `<h1>` page titles carry
 * `.text-gradient-accent`. Card headings were never in scope, and the numbers
 * say so plainly — 0 of 304 crm7 `<h2>`/`<h3>`, 15 of 734 estate-wide. The work
 * was done, declared complete, and covered a DIFFERENT ELEMENT than the one the
 * operator keeps pointing at. On the very dashboard he screenshotted,
 * "Dashboard" (h1) has the gradient and "Quick Actions", "Communication Center"
 * and "Pipeline Overview" (h2/h3) do not.
 *
 * SO WHY NOT JUST GREP `<h2`? Because `<h2>` is not the same thing as "card
 * heading", and a sweep that treats them as equal gradients dialog titles,
 * empty-state titles, section labels and table captions along with the cards.
 * The operator asked for card headings. A detector that cannot tell a card
 * heading from any other heading would deliver 734 changes to satisfy a request
 * about roughly 600 of them, and the excess is what gets noticed.
 *
 * A heading is a CARD heading here when an enclosing element paints card chrome
 * — a card component, or a border+radius+background surface — which is the same
 * definition `cardSurfaceScanner` already uses for nested chrome. One definition
 * of "card", two scanners.
 *
 * FAIL CLOSED. A file whose JSX tags do not balance is UNKNOWN, not clean: a
 * tag stack that has lost its place cannot say what encloses what, and
 * "checked nothing" must not share an exit code with "found nothing" (D-92).
 *
 * Node-only: filesystem access, exported from `@bsuite/page-builder/scanner`.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stripComments, elementDeclaresCardChrome } from './cardSurfaceScanner.js';

export interface CardHeadingFinding {
  file: string;
  /** `h2` or `h3`. */
  tag: string;
  /** 1-based line of the heading's opening tag. */
  line: number;
  /** The chrome element that makes this a card heading. */
  enclosingSurface: string;
  /** Does it already carry a gradient class? */
  hasGradient: boolean;
  /**
   * Classes that fight `width: fit-content`.
   *
   * `.text-gradient-accent` sets `width: fit-content`, and that is load-bearing
   * — `background-clip: text` paints across the ELEMENT BOX, so a block-level
   * heading spanning its container samples only the first slice of the gradient
   * and renders flat, which is indistinguishable from having no gradient at
   * all. But a heading that is `truncate`, `flex-1`, `w-full` or `line-clamp-*`
   * DEPENDS on filling its box, and shrink-wrapping it changes the layout.
   * Those headings need a decision, not a codemod.
   */
  widthDependentClasses: string[];
}

export interface CardHeadingScanResult {
  findings: CardHeadingFinding[];
  filesScanned: number;
  scanRootsResolved: string[];
  /** Files whose JSX could not be walked. UNKNOWN is not clean. */
  unknownFiles: string[];
  summary: string;
}

export interface CardHeadingScannerConfig {
  projectRoot: string;
  scanRoots: string[];
  /** Component names that count as card chrome. */
  cardTags: string[];
  /** Extra chrome components, as in `cardSurfaceScanner`. */
  nestedChromeTags?: string[];
  /** Heading tags to consider. Defaults to h2 and h3 — h1 is the page title. */
  headingTags?: string[];
  /** Classes that already paint a heading gradient. */
  gradientClasses?: string[];
  extensions?: string[];
}

const DEFAULT_HEADINGS = ['h2', 'h3'];
const DEFAULT_GRADIENT_CLASSES = ['text-gradient-accent', 'gradient-text'];
/**
 * Classes whose effect DEPENDS on the heading filling its box.
 *
 * `.text-gradient-accent` sets `width: fit-content`, and that is load-bearing —
 * `background-clip: text` paints across the ELEMENT BOX, so a block-level
 * heading spanning its container samples only the first slice of the gradient
 * and renders flat, indistinguishable from having no gradient at all. Shrinking
 * the box is therefore not optional; it is the effect.
 *
 * But shrinking the box is VISIBLE wherever the box itself is visible or
 * positioned. Three families, and the first was the only one measured on the
 * first pass:
 *
 *   1. SIZE — `truncate`, `flex-1`, `w-full`, `line-clamp-*`. Fit-content never
 *      truncates and never fills.
 *   2. POSITION — `text-center`, `mx-auto`. A centred heading stops centring the
 *      moment its box hugs the glyphs, because there is nothing left to centre
 *      the text inside.
 *   3. PAINT — the heading's OWN `border-*` or `bg-*`. A rule or a tinted strip
 *      that used to span the card suddenly ends at the last letter. This is the
 *      most visible of the three and the easiest to miss in a diff.
 *
 * A first, loose measurement over a three-line window put family 1 at 2 and
 * implied the sweep was nearly free. Reading the heading's OWN attributes puts
 * the full hazard set an order of magnitude higher. The loose number was the
 * kind that makes a codemod look safe.
 */
const WIDTH_DEPENDENT = [
  'truncate',
  'flex-1',
  'w-full',
  'grow',
  'flex-grow',
  'text-center',
  'mx-auto',
];
const WIDTH_DEPENDENT_PREFIXES = ['line-clamp-', 'basis-', 'w-', 'min-w-', 'max-w-'];
/** The heading paints its own box — a border or a background of its own. */
const OWN_PAINT = /(?:^|\s)(?:border(?:-[a-z0-9[\]().\-/]+)?|bg-[a-z0-9[\]().\-/]+)(?=$|\s)/;

/** Void HTML elements never carry a closing tag. */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

interface JsxTag {
  kind: 'open' | 'close' | 'self';
  tag: string;
  attrs: string;
  index: number;
}

/**
 * Tokenise JSX tags with their kind and offset.
 *
 * `openingTags` in the sibling module is deliberately kind-blind — it only has
 * to find chrome inside a known block. Ancestry needs a stack, and a stack
 * needs to know which tags close.
 */
export function jsxTags(source: string): JsxTag[] {
  const out: JsxTag[] = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '<') continue;
    const close = /^<\/([A-Za-z][A-Za-z0-9._-]*)\s*>/.exec(source.slice(i, i + 80));
    if (close) {
      out.push({ kind: 'close', tag: close[1], attrs: '', index: i });
      i += close[0].length - 1;
      continue;
    }
    const open = /^<([A-Za-z][A-Za-z0-9._-]*)/.exec(source.slice(i, i + 64));
    if (!open) continue;
    // KNOWN LIMITATION, measured rather than papered over. A TypeScript type
    // argument presents as a tag to any matcher this cheap:
    // `row.getValue<string>('code')` pushes `<string>`, and every ancestry
    // answer after it in that file is fiction. The file is therefore reported
    // UNKNOWN by the stack check below — 23 files across six apps, 0.8% of the
    // tree, named individually rather than absorbed.
    //
    // A GUARD WAS TRIED AND REVERTED, and the measurement is why. Skipping a
    // tag whose `<` is preceded by an identifier character catches the generics
    // — and also catches JSX that follows TEXT (`Total<span>`), which is
    // ordinary markup. Skipping an OPENING tag while its CLOSING tag is still
    // counted unbalances the stack outright, so UNKNOWN went from 23 to 106.
    // An over-eager filter feeding a stack is strictly worse than no filter,
    // and a real parser is the fix if 23 ever stops being acceptable.
    let j = i + open[0].length;
    let depth = 0;
    let quote: string | null = null;
    let closed = false;
    for (; j < source.length; j++) {
      const c = source[j];
      if (quote) {
        if (c === quote && source[j - 1] !== '\\') quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) { closed = true; break; }
    }
    if (!closed) continue;
    const attrs = source.slice(i + open[0].length, j);
    const selfClosing = /\/\s*$/.test(attrs) || VOID_TAGS.has(open[1]);
    out.push({
      kind: selfClosing ? 'self' : 'open',
      tag: open[1],
      attrs: attrs.replace(/\/\s*$/, ''),
      index: i,
    });
    i = j;
  }
  return out;
}

function classText(attrs: string): string {
  const m = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*)\})/.exec(attrs);
  if (!m) return '';
  if (m[1] !== undefined) return m[1];
  if (m[2] !== undefined) return m[2];
  const lit = /(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  const parts: string[] = [];
  let l: RegExpExecArray | null;
  while ((l = lit.exec(m[3] ?? '')) !== null) parts.push(l[1] ?? l[2] ?? l[3] ?? '');
  return parts.join(' ');
}

function widthDependent(classes: string): string[] {
  const tokens = classes.split(/\s+/).filter(Boolean);
  const hits = tokens.filter(
    (t) =>
      WIDTH_DEPENDENT.includes(t) ||
      WIDTH_DEPENDENT_PREFIXES.some((p) => t.startsWith(p)),
  );
  // A heading that paints its own box: shrinking the box moves the paint.
  for (const t of tokens)
    if (OWN_PAINT.test(` ${t} `) && !hits.includes(t)) hits.push(t);
  return hits;
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

export function scanCardHeadings(config: CardHeadingScannerConfig): CardHeadingScanResult {
  const extensions = config.extensions ?? ['.tsx'];
  const headings = new Set(config.headingTags ?? DEFAULT_HEADINGS);
  const gradientClasses = config.gradientClasses ?? DEFAULT_GRADIENT_CLASSES;
  const chromeTags = new Set([...config.cardTags, ...(config.nestedChromeTags ?? [])]);
  const findings: CardHeadingFinding[] = [];
  const unknownFiles: string[] = [];
  const files: string[] = [];
  const scanRootsResolved: string[] = [];

  // D-92: assert the inputs before reporting a verdict.
  for (const root of config.scanRoots) {
    const abs = join(config.projectRoot, root);
    if (!existsSync(abs))
      throw new Error(
        `[cardHeadingScanner] scan root "${root}" does not exist at ${abs}. ` +
          `A scanner that silently skips a missing root reports a false pass.`,
      );
    const before = files.length;
    walk(abs, extensions, files);
    if (files.length === before)
      throw new Error(
        `[cardHeadingScanner] scan root "${root}" matched ZERO files. ` +
          `Refusing to report a verdict from an empty scan.`,
      );
    scanRootsResolved.push(root);
  }

  for (const file of files) {
    const rel = relative(config.projectRoot, file);
    let src: string;
    try {
      src = stripComments(readFileSync(file, 'utf8'));
    } catch {
      unknownFiles.push(rel);
      continue;
    }
    if (!/<h[1-6][\s/>]/.test(src)) continue;

    const tags = jsxTags(src);
    const stack: { tag: string; attrs: string }[] = [];
    let lostPlace = false;

    for (const t of tags) {
      if (t.kind === 'self') continue;
      if (t.kind === 'close') {
        // A close with nothing to close, or closing something else, means the
        // stack no longer describes the tree. Ancestry answers become fiction
        // from here, so stop and report UNKNOWN rather than guess.
        const top = stack[stack.length - 1];
        if (!top || top.tag !== t.tag) { lostPlace = true; break; }
        stack.pop();
        continue;
      }
      if (headings.has(t.tag)) {
        const surface = stack
          .slice()
          .reverse()
          .map((a) => elementDeclaresCardChrome(a, chromeTags))
          .find((hit): hit is string => Boolean(hit));
        if (surface) {
          const classes = classText(t.attrs);
          findings.push({
            file: rel,
            tag: t.tag,
            line: src.slice(0, t.index).split('\n').length,
            enclosingSurface: surface,
            hasGradient: gradientClasses.some((g) =>
              new RegExp(`(?:^|\\s)${g}(?:$|\\s)`).test(classes),
            ),
            widthDependentClasses: widthDependent(classes),
          });
        }
      }
      stack.push({ tag: t.tag, attrs: t.attrs });
    }

    if (lostPlace) {
      unknownFiles.push(rel);
      // Drop this file's findings — an ancestry answer from a broken stack is
      // worse than no answer, because it looks like a measurement.
      for (let i = findings.length - 1; i >= 0; i--)
        if (findings[i].file === rel) findings.splice(i, 1);
    }
  }

  const missing = findings.filter((f) => !f.hasGradient);
  const risky = missing.filter((f) => f.widthDependentClasses.length > 0);
  const summary =
    `scanned ${files.length} files across ${scanRootsResolved.length} root(s) [${scanRootsResolved.join(', ')}]; ` +
    `${findings.length} card heading(s), ${findings.length - missing.length} already gradient, ` +
    `${missing.length} without — of which ${risky.length} carry a width-dependent class and need a ` +
    `decision rather than a codemod; ${unknownFiles.length} UNKNOWN file(s) — an UNKNOWN is not a clean file.`;

  return { findings, filesScanned: files.length, scanRootsResolved, unknownFiles, summary };
}
