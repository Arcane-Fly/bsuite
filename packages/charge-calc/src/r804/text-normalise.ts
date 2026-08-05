/**
 * TEXT NORMALISATION for comparing our strings against the award document.
 *
 * PORTED VERBATIM from R80.4 src/awards/text-normalise.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy.
 *
 * BSUITE RULE: no regex. Beyond the house standard, regex is the wrong tool here
 * specifically — the failures it produced were all TYPOGRAPHY, and a pattern
 * that encodes typography is a pattern that breaks on the next re-conversion.
 *
 * Three characters caused three separate false failures against MA000020, each
 * on data that was correct:
 *   -  em-dash        "clause 23.7—Air-conditioning"   vs a hyphen in our text
 *   -  non-breaking space   "clause 23.7"          vs a normal space
 *   -  curly apostrophe     "Electrician’s licence" vs "Electrician's"
 *
 * A docx-to-markdown conversion introduces all three and will introduce more.
 * Normalise, then compare with plain includes().
 */

/** Character substitutions, applied by split/join. No patterns. */
const SUBSTITUTIONS: Array<[string, string]> = [
  ["’", "'"],   // right single quote -> apostrophe
  ["‘", "'"],   // left single quote
  ["“", '"'],   // left double quote
  ["”", '"'],   // right double quote
  ["—", "-"],   // em dash
  ["–", "-"],   // en dash
  ["−", "-"],   // minus sign
  [" ", " "],   // non-breaking space
  [" ", " "],   // thin space
  ["​", ""],    // zero-width space
  /*
   * MARKDOWN EMPHASIS AND ESCAPES. The award document bolds every monetary
   * figure and percentage — "a casual loading of **17.5%** and, in addition"
   * — and escapes punctuation ("19\.", "part**\-**time"). Neither is content.
   *
   * Leaving them in meant any assertion spanning a FIGURE could not match,
   * which quietly pushed every such test into asserting the prose AROUND the
   * number instead of the number itself — weakest exactly where the amount
   * matters. Order matters: "**" must be folded before "*". Found 2026-08-04.
   */
  ["**", ""],   // bold
  /*
   * ITALIC. The award italicises every instrument title — "Schedule E to the
   * *Miscellaneous Award 2020*" — and after link folding the emphasis marks
   * are what is left behind. An assertion naming an award, an Act or a
   * regulation could not match while they stayed. MUST come after "**", or a
   * bold marker is folded into a stray single asterisk. Found 2026-08-04 on
   * MA000005 cl.17.4, the Schedule E incorporation clause.
   */
  ["*", ""],    // italic
  ["\\", ""],   // escaped punctuation
];

/**
 * Fold `[text](url)` down to `text`, by walking. No pattern.
 *
 * THE AWARD LINKS ITS MOST-CITED TERMS. "the payment required by the
 * [NES](https://www.fwc.gov.au/.../nes.pdf) or the ordinary pay" — so any
 * assertion spanning the words NES, Act, or a PR number silently could not
 * match, and the URL is not content. This is the same defect the markdown-bold
 * fold cured for amounts: it does not fail loudly, it quietly pushes the test
 * into asserting the prose either side of the linked term. Found 2026-08-04 on
 * MA000104 cl.21.3, where every limb of a greater-of sits around a link.
 */
function foldMarkdownLinks(s: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const mid = s.indexOf("](", i);
    if (mid < 0) { out += s.slice(i); return out; }
    const close = s.indexOf(")", mid + 2);
    const open = s.lastIndexOf("[", mid);
    if (close < 0 || open < i) { out += s.slice(i); return out; }
    out += s.slice(i, open) + s.slice(open + 1, mid);
    i = close + 1;
  }
}

/**
 * Normalise award text for comparison: fold the typography, collapse runs of
 * whitespace, lowercase. Everything is split/join — no pattern matching.
 */
export function normaliseAwardText(s: string): string {
  /* Links are folded FIRST: the escape-stripping substitution below would
     otherwise turn the award's "\[Varied by [PR...](url)\]" into a shape whose
     brackets no longer pair. */
  let out = foldMarkdownLinks(s);
  for (const [from, to] of SUBSTITUTIONS) out = out.split(from).join(to);
  // Collapse whitespace without a pattern: split on every whitespace char,
  // drop the empties, rejoin with a single space.
  out = out.split("\n").join(" ").split("\t").join(" ").split("\r").join(" ");
  out = out.split(" ").filter((x) => x.length > 0).join(" ");
  return out.toLowerCase();
}

/** Does the award contain this phrase, ignoring typography and whitespace? */
export function awardContains(awardText: string, phrase: string): boolean {
  return normaliseAwardText(awardText).includes(normaliseAwardText(phrase));
}

/**
 * Does the award contain a MONEY figure, as the award writes it?
 * Amounts appear as "**67.15**", "$67.15" and "| 67.15 |". Comparing a JS number
 * fails on the trailing zero (1013.50 stringifies as "1013.5"), so always format
 * to two decimals before looking.
 */
export function awardContainsAmount(awardText: string, amount: number): boolean {
  const hay = normaliseAwardText(awardText);
  /* The award writes SOME amounts with decimals ("67.15") and some without
     ("2390"). Checking only the two-decimal form failed on the latter, which is
     correct data, so accept either.
     THE TOKEN BOUNDARY IS LOAD-BEARING. The comment here used to CLAIM the
     two-decimal form was matched as a whole token, and it was not — a plain
     includes() finds "1.33" inside "51.339", so a $1.33 allowance could be
     reported as present in an award that never mentions it. A doc-comment
     asserting a guard that the code does not implement is worse than no
     comment: it is what a reviewer checks INSTEAD of the code. Found
     2026-08-04 by asserting the comment's own example. */
  if (containsWholeNumberToken(hay, amount.toFixed(2))) return true;
  return Number.isInteger(amount) && containsWholeNumberToken(hay, String(amount));
}

/**
 * Does `hay` contain `token` as a complete number — not as a fragment of a
 * longer one? A digit or a decimal point on either side means it is a fragment.
 * Character tests, no pattern.
 */
function containsWholeNumberToken(hay: string, token: string): boolean {
  const isDigit = (c: string) => c >= "0" && c <= "9";
  let from = 0;
  for (;;) {
    const at = hay.indexOf(token, from);
    if (at < 0) return false;
    const before = at > 0 ? hay[at - 1] : "";
    const afterAt = at + token.length;
    const after = afterAt < hay.length ? hay[afterAt] : "";
    /* A "." before means we are inside the fractional part of a larger figure
       (1.33 inside 51.339 is caught by the digit test; .33 inside 1.334 by
       this one). A "." after means more precision follows. */
    const fragment = isDigit(before) || before === "." || isDigit(after) || after === ".";
    if (!fragment) return true;
    from = at + 1;
  }
}

/** Digits only, by character test. Replaces `.replace(/[^0-9]/g, "")`. */
export function digitsOnly(s: string): string {
  let out = "";
  for (const ch of s) if (ch >= "0" && ch <= "9") out += ch;
  return out;
}

/**
 * The FIRST run of digits in a string, as a number. Replaces `/(\d+)/.exec(x)`.
 * Returns null where there is none, so a caller cannot mistake "no number" for 0.
 */
export function firstNumber(s: string): number | null {
  let run = "";
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") run += ch;
    else if (run.length) break;
  }
  return run.length ? Number(run) : null;
}

/**
 * Does `haystack` contain `phrase`, ignoring typography, whitespace and case?
 * The plain-string replacement for `assert.match(x, /phrase/)`.
 */
export function textContains(haystack: string, phrase: string): boolean {
  return normaliseAwardText(String(haystack)).includes(normaliseAwardText(phrase));
}

/**
 * Is this a usable award clause reference — "29", "19.7", "23.3(e)(i)"?
 * Character-by-character, no pattern. Replaces a regex whose only real job was
 * "digits, then optional dotted/parenthesised segments".
 */
export function isClauseReference(s: string | undefined | null): boolean {
  if (!s) return false;
  const t = String(s).trim();
  if (t.length === 0 || t.length > 20) return false;
  // must start with 1-2 digits
  let i = 0;
  while (i < t.length && t[i] >= "0" && t[i] <= "9") i++;
  if (i === 0 || i > 2) return false;
  // the remainder may only be digits, letters, dots and parentheses
  for (const ch of t.slice(i)) {
    const ok = ch === "." || ch === "(" || ch === ")" ||
      (ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
    if (!ok) return false;
  }
  return true;
}

/**
 * The number that follows `label` in a line of text, or null.
 * Replaces output-parsing regexes like `/(\d+) passed/`.
 * Example: countBefore("363 passed, 0 failed", "passed") -> 363
 */
export function countBefore(text: string, label: string): number | null {
  const i = text.indexOf(label);
  if (i < 0) return null;
  let j = i - 1;
  while (j >= 0 && text[j] === " ") j--;
  let run = "";
  while (j >= 0 && text[j] >= "0" && text[j] <= "9") { run = text[j] + run; j--; }
  return run.length ? Number(run) : null;
}

/** Every number that precedes `label`, summed. For multi-line tool output. */
export function sumCountsBefore(text: string, label: string): number {
  let total = 0;
  for (const line of text.split("\n")) {
    const n = countBefore(line, label);
    if (n !== null) total += n;
  }
  return total;
}

/** Number of times `needle` occurs in `text`. Replaces a global-match count. */
export function occurrences(text: string, needle: string): number {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

/* ── PARSERS — the four things this codebase used regex for ──────────────── */

/**
 * A line from the award's table of contents: "19\. Minimum rates 30".
 * Returns the clause number and title, or null. Character-walking, no pattern.
 */
export function parseAwardTocLine(line: string): { clause: string; title: string } | null {
  const t = line.trim();
  let i = 0;
  while (i < t.length && t[i] >= "0" && t[i] <= "9") i++;
  if (i === 0 || i > 3) return null;
  /* LETTERED CLAUSES. Awards insert clauses as "13A", "26A" — every award
     sampled carries at least two ("Employee right to disconnect", "Workplace
     delegates' rights"). Requiring digits-then-dot silently dropped them from
     the denominator, so a coverage ledger could claim EVERY clause was
     classified while two were never enumerated. Found 2026-08-04. */
  if (i < t.length && t[i] >= "A" && t[i] <= "Z") i++;
  const clause = t.slice(0, i);
  let rest = t.slice(i);
  if (rest.startsWith("\\")) rest = rest.slice(1);      // the escaped "19\."
  if (!rest.startsWith(".")) return null;
  rest = rest.slice(1).trim();
  // the trailing page number
  let j = rest.length;
  while (j > 0 && rest[j - 1] >= "0" && rest[j - 1] <= "9") j--;
  if (j === rest.length) return null;                   // no page number
  const title = rest.slice(0, j).trim();
  return title.length ? { clause, title } : null;
}

/** The value of `KEY=` in a .env-style file. Quotes stripped. */
export function envValue(text: string, key: string): string | null {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith(key)) continue;
    const rest = line.slice(key.length).trim();
    if (!rest.startsWith("=")) continue;
    let v = rest.slice(1).trim();
    if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) v = v.slice(1, -1);
    return v.length ? v : null;
  }
  return null;
}

/** Every `"..."` string that follows an occurrence of `key` in `src`. */
export function extractQuotedAfter(src: string, key: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = src.indexOf(key, from);
    if (at < 0) break;
    const q1 = src.indexOf('"', at + key.length);
    if (q1 < 0) break;
    const q2 = src.indexOf('"', q1 + 1);
    if (q2 < 0) break;
    out.push(src.slice(q1 + 1, q2));
    from = q2 + 1;
  }
  return out;
}

/**
 * Every clause reference in a line of source, in either house style:
 *   clause: "N.n(x)"              the MA000020 modules
 *   cite:   "MAxxxxxx cl.N.n(x)"   the MA000025 modules
 * A citation may carry two clauses joined by "+"; both count.
 *
 * The examples above are deliberately written with placeholders. A real-looking
 * citation in a doc comment is INDISTINGUISHABLE from a code citation to the
 * validator, and a worked example here was picked up as an unverified reference
 * against a different award.
 */
export function extractClauseRefs(line: string): string[] {
  const out: string[] = [];
  /*
   * "Cite: " (capital C) catches SUFFIXED keys — feesCite, partTimeCite,
   * blockReleaseTravelCite. A module carrying several citations names them
   * apart, and matching only the bare `cite:` left every one of those
   * unverified by the clause ledger while the gate still reported PASS.
   */
  for (const raw of [
    ...extractQuotedAfter(line, "clause: "),
    ...extractQuotedAfter(line, "cite: "),
    ...extractQuotedAfter(line, "Cite: "),
  ]) {
    // strip a leading award code, then split on "+" and on " cl."
    let v = raw;
    const at = v.indexOf("cl.");
    if (at >= 0) v = v.slice(at + 3);
    for (const part of v.split("+")) {
      const t = part.trim();
      if (isClauseReference(t)) out.push(t);
    }
  }
  return out;
}

/**
 * `name: "X", amount: N` pairs from the allowance catalogue source.
 * Walks the text rather than matching a shape, so a reformat does not break it.
 */
export function extractNameAmountPairs(src: string): Array<{ name: string; amount: string }> {
  const out: Array<{ name: string; amount: string }> = [];
  let from = 0;
  for (;;) {
    const at = src.indexOf("name:", from);
    if (at < 0) break;
    const q1 = src.indexOf('"', at);
    const q2 = q1 < 0 ? -1 : src.indexOf('"', q1 + 1);
    if (q2 < 0) break;
    const name = src.slice(q1 + 1, q2);
    const amountAt = src.indexOf("amount:", q2);
    if (amountAt < 0 || amountAt - q2 > 200) { from = q2 + 1; continue; }
    let k = amountAt + "amount:".length;
    while (k < src.length && src[k] === " ") k++;
    let num = "";
    while (k < src.length && ((src[k] >= "0" && src[k] <= "9") || src[k] === ".")) { num += src[k]; k++; }
    if (num.length) out.push({ name, amount: num });
    from = k;
  }
  return out;
}

/**
 * Whole-word containment, without a pattern. Replaces `/\bword\b/.test(s)`.
 * A word boundary is any character that is not a letter or digit.
 */
export function hasWord(haystack: string, word: string): boolean {
  const h = normaliseAwardText(haystack);
  const w = normaliseAwardText(word);
  if (!w) return false;
  const isWordChar = (c: string) =>
    (c >= "a" && c <= "z") || (c >= "0" && c <= "9");
  let from = 0;
  for (;;) {
    const at = h.indexOf(w, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : h[at - 1];
    const after = at + w.length >= h.length ? "" : h[at + w.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = at + 1;
  }
}

/**
 * Is this an award corpus filename — "MA000020.md"? Replaces
 * `/^MA\d{6}\.md$/.test(f)`, walked character by character.
 */
export function isAwardFileName(f: string): boolean {
  if (!f.startsWith("MA") || !f.endsWith(".md")) return false;
  const digits = f.slice(2, f.length - 3);
  if (digits.length !== 6) return false;
  for (const c of digits) if (c < "0" || c > "9") return false;
  return true;
}

/**
 * Does module file `f` belong to `award` for clause-ledger purposes?
 *
 * MA000020 was modelled first, so the SHARED modules (round.ts, interactions.ts,
 * inclement-weather.ts, resolve-ordinary-rate.ts) carry its clause references by
 * history. A later award owns only the modules whose filename names it.
 *
 * This lived in the validator alone, and the ledger-sync script re-implemented
 * the rule slightly differently — which emptied every ledger it touched while
 * reporting "0 references, all resolved". One implementation, used by both.
 */
export function ownsAwardModule(f: string, award: string): boolean {
  const file = f.toLowerCase();
  const code = award.toLowerCase();
  if (!file.endsWith(".ts") || file.endsWith(".test.ts")) return false;
  if (file.startsWith(code)) return true;
  /*
   * MA000020 additionally owns the SHARED modules — the ones whose names do not
   * begin with an award code at all.
   *
   * This used to read `!file.startsWith("ma0000")`, which is a prefix test for
   * a SIX-digit code beginning with four zeros. "ma000104" does not begin
   * "ma0000", so every MA000104 module was treated as shared and its citations
   * were validated against MA000020's table of contents — where cl.15.2(b)
   * resolves to "Classifications" rather than the apprentice rates it actually
   * cites, and D4 went red for MA000020 alone with 25 phantom problems. The
   * corpus runs past MA000100, so the guard has to recognise the SHAPE of an
   * award-code prefix rather than one family of them. Found 2026-08-04, on
   * closing the last award in the queue.
   *
   * The MA000020 condition is load-bearing in the other direction too: without
   * it EVERY award would own the shared modules, and interactions.ts's
   * "cl.42.2(c)" — an MA000020 clause — would be validated against nine other
   * awards' tables of contents and refused by all of them.
   */
  return code === "ma000020" && !startsWithAwardCode(file);
}

/** Does this filename begin with "maNNNNNN"? Character tests, no pattern. */
function startsWithAwardCode(file: string): boolean {
  if (file.length < 8) return false;
  if (file[0] !== "m" || file[1] !== "a") return false;
  for (let i = 2; i < 8; i++) {
    const c = file[i];
    if (c < "0" || c > "9") return false;
  }
  return true;
}
