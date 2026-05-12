import {
  getRoutingDecision,
  meetsProtectionGateRequirements,
  type Effort,
  type PullRequestProtectionState,
  type Severity,
} from './routing-matrix';
import { createTrackingRecord, type SlaTrackingRecord } from './sla-tracker';

export interface ClassificationInput {
  readonly issueNumber: number;
  readonly severity: Severity;
  readonly effort: Effort;
}

export interface CronRoutingResult {
  readonly owner: string;
  readonly autoMergeAllowed: boolean;
  readonly trackingRecord: SlaTrackingRecord | null;
}

export const routeIssueFromQ303Classification = (
  classification: ClassificationInput,
  nowIso: string,
  prProtectionState: PullRequestProtectionState,
): CronRoutingResult => {
  const decision = getRoutingDecision(classification);

  return {
    owner: decision.owner,
    autoMergeAllowed: meetsProtectionGateRequirements(decision, prProtectionState),
    trackingRecord: createTrackingRecord(
      classification.issueNumber,
      classification.severity,
      classification.effort,
      nowIso,
    ),
  };
};
