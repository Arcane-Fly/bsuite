export {
  ROUTING_MATRIX,
  SEVERITIES,
  EFFORTS,
  getRoutingDecision,
  escalateSeverity,
  canAutoMergeP3Xs,
  type Severity,
  type Effort,
  type RoutingDecision,
  type Classification,
  type PullRequestProtectionState,
} from './routing-matrix';

export {
  createTrackingRecord,
  checkSlaBreaches,
  type SlaTrackingRecord,
  type SlaTrackingStore,
  type EscalationAction,
} from './sla-tracker';

export { routeIssueFromQ303Classification, type ClassificationInput, type CronRoutingResult } from './cron-a';
