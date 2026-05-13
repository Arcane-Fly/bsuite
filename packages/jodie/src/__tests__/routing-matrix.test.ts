import { describe, expect, it } from 'vitest';

import {
  EFFORTS,
  ROUTING_MATRIX,
  SEVERITIES,
  checkSlaBreaches,
  createTrackingRecord,
  getRoutingDecision,
  meetsProtectionGateRequirements,
  type SlaTrackingRecord,
  type SlaTrackingStore,
} from '../index';

class InMemorySlaStore implements SlaTrackingStore {
  private readonly records = new Map<number, SlaTrackingRecord>();

  async upsert(record: SlaTrackingRecord) {
    this.records.set(record.issueNumber, record);
    return record;
  }

  async listDue(nowIso: string) {
    const now = new Date(nowIso).getTime();
    return [...this.records.values()].filter((record) => new Date(record.deadlineAt).getTime() <= now);
  }

  get(issueNumber: number) {
    return this.records.get(issueNumber);
  }
}

describe('ROUTING_MATRIX', () => {
  it('maps every severity×effort cell to a non-throwing routing decision', () => {
    for (const severity of SEVERITIES) {
      for (const effort of EFFORTS) {
        expect(() => getRoutingDecision({ severity, effort })).not.toThrow();
        expect(ROUTING_MATRIX[severity][effort]).toBeDefined();
      }
    }
  });

  it('gates P3-XS auto-merge on protected branch + green CI + >=1 human approval', () => {
    const decision = ROUTING_MATRIX.P3.XS;

    expect(
      meetsProtectionGateRequirements(decision, {
        isBranchProtected: true,
        isCiGreen: true,
        humanApprovalCount: 1,
      }),
    ).toBe(true);

    expect(
      meetsProtectionGateRequirements(decision, {
        isBranchProtected: false,
        isCiGreen: true,
        humanApprovalCount: 1,
      }),
    ).toBe(false);

    expect(
      meetsProtectionGateRequirements(decision, {
        isBranchProtected: true,
        isCiGreen: false,
        humanApprovalCount: 1,
      }),
    ).toBe(false);

    expect(
      meetsProtectionGateRequirements(decision, {
        isBranchProtected: true,
        isCiGreen: true,
        humanApprovalCount: 0,
      }),
    ).toBe(false);
  });
});

describe('SLA tracker', () => {
  it('writes and reads tracking rows', async () => {
    const store = new InMemorySlaStore();
    const nowIso = '2026-05-12T00:00:00.000Z';
    const record = createTrackingRecord(101, 'P2', 'S', nowIso);

    expect(record).not.toBeNull();
    await store.upsert(record!);

    const due = await store.listDue('2026-05-13T01:00:00.000Z');
    expect(due).toHaveLength(1);
    expect(due[0]?.issueNumber).toBe(101);
    expect(due[0]?.owner).toBe('@copilot');
  });

  it('escalates severity on SLA breach using synthetic time travel', async () => {
    const store = new InMemorySlaStore();
    const start = '2026-05-12T00:00:00.000Z';

    const record = createTrackingRecord(202, 'P2', 'XS', start);
    await store.upsert(record!);

    const actions = await checkSlaBreaches(store, '2026-05-13T01:00:00.000Z');

    expect(actions).toHaveLength(1);
    expect(actions[0]?.fromSeverity).toBe('P2');
    expect(actions[0]?.toSeverity).toBe('P1');
    expect(actions[0]?.pageHuman).toBe(false);

    const updated = store.get(202);
    expect(updated?.severity).toBe('P1');
    expect(updated?.breachCount).toBe(1);
  });

  it('pages a human and labels escalated after two breaches', async () => {
    const store = new InMemorySlaStore();
    const start = '2026-05-12T00:00:00.000Z';

    const record = createTrackingRecord(303, 'P2', 'XS', start);
    await store.upsert(record!);

    await checkSlaBreaches(store, '2026-05-13T01:00:00.000Z');
    const actions = await checkSlaBreaches(store, '2026-05-14T01:00:00.000Z');

    expect(actions).toHaveLength(1);
    expect(actions[0]?.breachCount).toBe(2);
    expect(actions[0]?.pageHuman).toBe(true);
    expect(actions[0]?.labelsToAdd).toContain('escalated');

    const updated = store.get(303);
    expect(updated?.owner).toBe('human-page');
    expect(updated?.humanPagedAt).not.toBeNull();
  });
});
