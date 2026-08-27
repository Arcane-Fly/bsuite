/**
 * doc-conventions.mjs — the ONE definition of which files under docs/ are
 * navigational rather than authored.
 *
 * WHY THIS FILE EXISTS. `check-doc-naming.mjs` and `check-doc-classification.mjs`
 * both need this set, and until 2026-08-27 only the first had it. Over the same
 * corpus one gate exempted 22 files and the other counted every one of them as
 * classification debt — so the two gates disagreed about what a document IS, and
 * a link-only sweep across an index was refused as unclassified authorship.
 *
 * The first fix duplicated the set into the second gate with a comment saying
 * "keep these in sync by hand". That is a second thing to forget, and a rule
 * held in two places is a rule that will diverge. This module is the fix to the
 * fix: both gates import it, so there is nothing to keep in sync.
 *
 * `check-doc-naming.mjs` runs at top level and calls process.exit, so it cannot
 * be imported for its constants without executing the gate. Hence a third file
 * rather than one importing the other.
 */

/**
 * An index of documents is not a document. These declare no `kind`, no
 * `authority` and no `evidence`, and are exempt from classification — but NOT
 * from the naming convention, which they still obey.
 */
export const NAVIGATIONAL_FILES = new Set([
  'readme.md',
  'status.md',
  'contributing.md',
  'index.md',
  'parent-docs.md',
]);

/** True when `p` (any path) names a navigational file. Case-insensitive. */
export function isNavigational(p) {
  return NAVIGATIONAL_FILES.has(p.split('/').pop().toLowerCase());
}
