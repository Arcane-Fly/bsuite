import { escalateSeverity, getRoutingDecision, type Effort, type Severity } from './routing-matrix';

export interface SlaTrackingRecord {
  readonly issueNumber: number;
  readonly severity: Severity;
  readonly effort: Effort;
  readonly owner: string;
  readonly deadlineAt: string;
  readonly breachCount: number;
  readonly escalated: boolean;
  readonly escalatedAt: string | null;
  readonly humanPagedAt: string | null;
}

export interface SlaTrackingStore {
  upsert(record: SlaTrackingRecord): Promise<SlaTrackingRecord>;
  listOpen(nowIso: string): Promise<ReadonlyArray<SlaTrackingRecord>>;
}

export interface EscalationAction {
  readonly issueNumber: number;
  readonly fromSeverity: Severity;
  readonly toSeverity: Severity;
  readonly breachCount: number;
  readonly pageHuman: boolean;
  readonly labelsToAdd: ReadonlyArray<string>;
}

const addMinutes = (iso: string, minutes: number): string => {
  const timestamp = new Date(iso).getTime();
  return new Date(timestamp + minutes * 60_000).toISOString();
};

const shouldTrackSla = (minutes: number | null): minutes is number => minutes !== null;

export const createTrackingRecord = (
  issueNumber: number,
  severity: Severity,
  effort: Effort,
  nowIso: string,
): SlaTrackingRecord | null => {
  const decision = getRoutingDecision({ severity, effort });

  if (!shouldTrackSla(decision.slaMinutes)) {
    return null;
  }

  return {
    issueNumber,
    severity,
    effort,
    owner: decision.owner,
    deadlineAt: addMinutes(nowIso, decision.slaMinutes),
    breachCount: 0,
    escalated: false,
    escalatedAt: null,
    humanPagedAt: null,
  };
};

export const checkSlaBreaches = async (
  store: SlaTrackingStore,
  nowIso: string,
): Promise<ReadonlyArray<EscalationAction>> => {
  const dueRecords = await store.listOpen(nowIso);
  const now = new Date(nowIso).getTime();
  const actions: EscalationAction[] = [];

  for (const record of dueRecords) {
    if (new Date(record.deadlineAt).getTime() > now) {
      continue;
    }

    const nextBreachCount = record.breachCount + 1;
    const escalatedSeverity = escalateSeverity(record.severity);
    const escalatedDecision = getRoutingDecision({ severity: escalatedSeverity, effort: record.effort });
    const escalatedAt = new Date(now).toISOString();
    const pageHuman = nextBreachCount >= 2;

    const updatedRecord: SlaTrackingRecord = {
      ...record,
      breachCount: nextBreachCount,
      severity: escalatedSeverity,
      owner: pageHuman ? 'human-page' : escalatedDecision.owner,
      deadlineAt: shouldTrackSla(escalatedDecision.slaMinutes)
        ? addMinutes(nowIso, escalatedDecision.slaMinutes)
        : record.deadlineAt,
      escalated: true,
      escalatedAt,
      humanPagedAt: pageHuman ? escalatedAt : record.humanPagedAt,
    };

    await store.upsert(updatedRecord);

    actions.push({
      issueNumber: record.issueNumber,
      fromSeverity: record.severity,
      toSeverity: escalatedSeverity,
      breachCount: nextBreachCount,
      pageHuman,
      labelsToAdd: pageHuman ? ['escalated'] : [],
    });
  }

  return actions;
};
