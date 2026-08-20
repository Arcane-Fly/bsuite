/**
 * The smallest semver-range satisfier that can honestly answer the question
 * `check-unmet-peer-deps.mjs` asks, and that REFUSES rather than guesses.
 *
 * Why not the `semver` package: the gate that uses this runs on a bare
 * `actions/checkout` with no install step, because the thing it inspects is a
 * COMMITTED lockfile and requiring an install would make the gate slower than
 * the defect is rare. That is a deliberate trade, and the price is this file.
 *
 * The price is bounded because the input is bounded. Every peer range declared
 * across the six apps was enumerated on 2026-08-20 and they use exactly these
 * forms:
 *
 *   ^1   ^4.0.0   ~1.2   >=18   >=0.8.0 <2   ^18.3.0 || ^19.0.0   ^3 || ^4
 *
 * ANY form this file does not recognise throws. It never falls through to
 * "true". A range checker that quietly passes what it cannot parse is worse
 * than no range checker, because it launders an unknown into an assurance —
 * the estate has lost days to gates that could not tell "found nothing" from
 * "looked nowhere".
 *
 * Prerelease versions are deliberately NOT given npm's special exclusion rules.
 * No @bsuite package or its peers ships a prerelease, and implementing that
 * corner half-right is how a subtle wrong answer gets in. A prerelease on
 * either side throws.
 */

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const PARTIAL_RE = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

export function parseVersion(v) {
  const s = String(v).trim();
  if (/[-+]/.test(s)) {
    throw new Error(`prerelease or build metadata is not supported by this checker: "${v}"`);
  }
  const m = VERSION_RE.exec(s);
  if (!m) throw new Error(`not a plain semver version: "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function parsePartial(s) {
  const m = PARTIAL_RE.exec(s.trim());
  if (!m) throw new Error(`not a version or partial version: "${s}"`);
  return {
    major: Number(m[1]),
    minor: m[2] === undefined ? null : Number(m[2]),
    patch: m[3] === undefined ? null : Number(m[3]),
  };
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/** Lower bound of a partial: 1 -> 1.0.0, 1.2 -> 1.2.0, 1.2.3 -> 1.2.3 */
function floor(p) {
  return [p.major, p.minor ?? 0, p.patch ?? 0];
}

/**
 * `^` — compatible within the leftmost NON-ZERO element. This is the rule most
 * often got wrong: ^0.2.3 allows 0.2.x and NOT 0.3.0, and ^0.0.3 allows only
 * 0.0.3. R80.4's outage lived in exactly this territory (^0.8.0 vs 1.0.1).
 */
function caretUpper(p) {
  if (p.major !== 0) return [p.major + 1, 0, 0];
  if (p.minor === null) return [1, 0, 0]; // ^0 -> <1.0.0
  if (p.minor !== 0) return [0, p.minor + 1, 0];
  if (p.patch === null) return [0, 1, 0]; // ^0.0 -> <0.1.0
  return [0, 0, p.patch + 1]; // ^0.0.3 -> <0.0.4
}

/** `~` — allows patch-level changes if a minor is given, else minor-level. */
function tildeUpper(p) {
  if (p.minor === null) return [p.major + 1, 0, 0];
  return [p.major, p.minor + 1, 0];
}

/** A single comparator, e.g. `^1.2`, `>=18`, `<2`, `1.0.0`, `*`. */
function satisfiesComparator(version, raw) {
  const c = raw.trim();
  if (c === '' || c === '*' || c === 'x') return true;

  if (c.startsWith('^')) {
    const p = parsePartial(c.slice(1));
    return cmp(version, floor(p)) >= 0 && cmp(version, caretUpper(p)) < 0;
  }
  if (c.startsWith('~')) {
    const p = parsePartial(c.slice(1));
    return cmp(version, floor(p)) >= 0 && cmp(version, tildeUpper(p)) < 0;
  }
  if (c.startsWith('>=')) return cmp(version, floor(parsePartial(c.slice(2)))) >= 0;
  if (c.startsWith('<=')) {
    const p = parsePartial(c.slice(2));
    // `<=1` means "1.x is fine": the ceiling of a partial is its whole range.
    const upper = p.patch !== null ? floor(p) : [
      p.minor !== null ? p.major : p.major + 1,
      p.minor !== null ? p.minor + 1 : 0,
      0,
    ];
    return p.patch !== null ? cmp(version, upper) <= 0 : cmp(version, upper) < 0;
  }
  if (c.startsWith('>')) {
    const p = parsePartial(c.slice(1));
    // `>1` means "strictly above every 1.x".
    const bound = p.patch !== null ? floor(p) : (p.minor !== null ? [p.major, p.minor + 1, -1] : [p.major + 1, 0, -1]);
    return cmp(version, bound) > 0;
  }
  if (c.startsWith('<')) return cmp(version, floor(parsePartial(c.slice(1)))) < 0;
  if (c.startsWith('=')) return cmp(version, parseVersion(c.slice(1))) === 0;

  // A bare partial: `1` means 1.x.x, `1.2` means 1.2.x, `1.2.3` is exact.
  const p = parsePartial(c);
  if (p.patch !== null) return cmp(version, floor(p)) === 0;
  const upper = p.minor !== null ? [p.major, p.minor + 1, 0] : [p.major + 1, 0, 0];
  return cmp(version, floor(p)) >= 0 && cmp(version, upper) < 0;
}

/**
 * Does `version` satisfy `range`? Throws on any syntax it does not recognise —
 * hyphen ranges (`1.2.3 - 2.0.0`), `x`/`*` wildcards inside a version
 * (`1.x`), and prereleases are all deliberately unsupported rather than
 * approximated.
 */
export function satisfies(version, range) {
  const v = parseVersion(version);
  const text = String(range).trim();
  if (text === '' || text === '*') return true;
  if (text.includes(' - ')) throw new Error(`hyphen ranges are not supported: "${range}"`);
  if (/\d+\.[xX*]/.test(text)) throw new Error(`x-ranges are not supported: "${range}"`);

  return text
    .split('||')
    .some((clause) =>
      clause
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .every((c) => satisfiesComparator(v, c)),
    );
}

export function selfTestSemverRange() {
  const ok = [
    ['1.0.1', '^1'],
    ['1.9.9', '^1'],
    ['1.0.2', '^1.0.0'],
    ['19.2.8', '>=18 <21'],
    ['19.2.8', '^18.3.0 || ^19.0.0'],
    ['4.4.3', '^4'],
    ['1.0.1', '>=0.8.0 <2'],
    ['0.8.1', '^0.8.0'],
    ['1.2.9', '~1.2'],
    ['2.111.0', '^2'],
    ['1.0.0', '1'],
    ['1.2.3', '1.2.3'],
  ];
  const notOk = [
    // THE R80.4 CASE: nav-core 1.0.1 against schema-registry 1.0.2's ^0.8.0.
    ['1.0.1', '^0.8.0'],
    ['0.9.0', '^0.8.0'],
    ['2.0.0', '>=0.8.0 <2'],
    ['21.0.0', '>=18 <21'],
    ['17.9.9', '>=18 <21'],
    ['0.0.4', '^0.0.3'],
    ['0.3.0', '^0.2.3'],
    ['1.3.0', '~1.2'],
    ['20.0.0', '^18.3.0 || ^19.0.0'],
  ];
  const throws = [
    ['1.0.0', '1.2.3 - 2.0.0'],
    ['1.0.0', '1.x'],
    ['1.0.0-beta.1', '^1'],
    ['1.0.0', 'latest'],
    ['1.0.0', 'workspace:^'],
  ];

  const failures = [];
  for (const [v, r] of ok) {
    let got;
    try {
      got = satisfies(v, r);
    } catch (e) {
      got = `threw: ${e.message}`;
    }
    if (got !== true) failures.push(`expected ${v} to satisfy ${r}, got ${got}`);
  }
  for (const [v, r] of notOk) {
    let got;
    try {
      got = satisfies(v, r);
    } catch (e) {
      got = `threw: ${e.message}`;
    }
    if (got !== false) failures.push(`expected ${v} NOT to satisfy ${r}, got ${got}`);
  }
  for (const [v, r] of throws) {
    let threw = false;
    try {
      satisfies(v, r);
    } catch {
      threw = true;
    }
    if (!threw) failures.push(`expected ${v} vs ${r} to THROW rather than guess`);
  }
  return { cases: ok.length + notOk.length + throws.length, failures };
}
