/**
 * Allowance interaction rules — TYPES ONLY, pending the award-data port.
 *
 * R80.4 src/awards/interactions.ts (commit 93b8643951cab759dff8428b63a29629975bb294)
 * also carries `INTERACTION_RULES` and `NTW_REFERENCES` — the per-award
 * replacement/exclusion catalogue (MA000020, MA000025, MA000036, MA000089) and
 * the National Training Wage incorporation-by-reference table. Those are
 * AWARD-SPECIFIC DATA, deliberately deferred per the port's scope discipline
 * ("award-specific data modules come next") — the same reason
 * `src/r804/registry.ts` ships with an empty TRACES map. Do not hand-transcribe
 * them here; port the whole upstream file when the award-data pass lands.
 *
 * `clause-rules.ts` needs only the `InteractionRule` TYPE (type-only import),
 * not the catalogue, so this stub is sufficient for the calc core.
 *
 * Read-only source; this file's job is scope-honesty, not functionality.
 */

export interface InteractionRule {
  clause: string;
  kind: "replaces" | "excludes";
  whenPresentPrefixes: string[];
  displacesPrefixes: string[];
  condition: string;
  quotedText: string;
}

export interface NtwReference {
  kind: "self_contained" | "incorporated_by_reference";
  targetAward?: string;
  targetSchedule: string;
  clause?: string;
  referenceTracksCurrentVersion?: boolean;
  deemsThisAwardToMeanHost?: boolean;
  doNotConflateParentAward?: boolean;
  quotedText: string;
  affectsTravel?: boolean;
}

/**
 * NOT PORTED YET — see the module note. Empty until the award-data pass lands,
 * so a caller gets "no interactions recorded" (a true statement) rather than a
 * fabricated catalogue.
 */
export const INTERACTION_RULES: Record<string, InteractionRule[]> = {};

/** NOT PORTED YET — see the module note. */
export const NTW_REFERENCES: Record<string, NtwReference> = {};

/** How this award obtains the NTW, or null if not recorded. */
export function ntwReferenceFor(awardCode: string): NtwReference | null {
  return NTW_REFERENCES[awardCode] || null;
}

/** Interaction rules for an award, or an empty list if none are recorded. */
export function interactionRulesFor(awardCode: string): InteractionRule[] {
  return INTERACTION_RULES[awardCode] || [];
}

/**
 * Awards for which interactions have been traced. Anything not listed has NOT
 * been checked for replacement/exclusion pairs — absence of a conflict warning
 * for those awards means "not analysed", not "no conflicts exist".
 */
export function awardsWithInteractionRules(): string[] {
  return Object.keys(INTERACTION_RULES);
}
