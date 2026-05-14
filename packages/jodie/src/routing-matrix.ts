export const SEVERITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export const EFFORTS = ['XS', 'S', 'M', 'L'] as const;

export type Severity = (typeof SEVERITIES)[number];
export type Effort = (typeof EFFORTS)[number];

export interface BranchProtectionGate {
  readonly requireBranchProtection: true;
  readonly requireGreenCi: true;
  readonly requireHumanApprovalCount: number;
}

export interface RoutingDecision {
  readonly owner:
    | 'jodie-auto-fix'
    | 'jodie-auto-close'
    | '@copilot'
    | '@claude'
    | 'human-page'
    | 'heavy-queue';
  readonly slaMinutes: number | null;
  readonly branchProtectionGate?: BranchProtectionGate;
}

const HOUR = 60;
const DAY = HOUR * 24;

export const ROUTING_MATRIX: Record<Severity, Record<Effort, RoutingDecision>> = {
  P0: {
    XS: { owner: 'jodie-auto-fix', slaMinutes: 15 },
    S: { owner: '@claude', slaMinutes: 4 * HOUR },
    M: { owner: 'human-page', slaMinutes: 4 * HOUR },
    L: { owner: 'human-page', slaMinutes: 4 * HOUR },
  },
  P1: {
    XS: { owner: '@copilot', slaMinutes: 4 * HOUR },
    S: { owner: '@claude', slaMinutes: 4 * HOUR },
    M: { owner: '@claude', slaMinutes: DAY },
    L: { owner: 'heavy-queue', slaMinutes: null },
  },
  P2: {
    XS: { owner: 'jodie-auto-fix', slaMinutes: DAY },
    S: { owner: '@copilot', slaMinutes: DAY },
    M: { owner: '@claude', slaMinutes: 3 * DAY },
    L: { owner: 'heavy-queue', slaMinutes: null },
  },
  P3: {
    XS: {
      owner: 'jodie-auto-close',
      slaMinutes: DAY,
      branchProtectionGate: {
        requireBranchProtection: true,
        requireGreenCi: true,
        requireHumanApprovalCount: 1,
      },
    },
    S: { owner: 'jodie-auto-close', slaMinutes: DAY },
    M: { owner: '@copilot', slaMinutes: 7 * DAY },
    L: { owner: 'heavy-queue', slaMinutes: null },
  },
};

export interface Classification {
  readonly severity: Severity;
  readonly effort: Effort;
}

export const getRoutingDecision = (classification: Classification): RoutingDecision =>
  ROUTING_MATRIX[classification.severity][classification.effort];

export const escalateSeverity = (severity: Severity): Severity => {
  switch (severity) {
    case 'P0':
      // P0 is terminal in the escalation ladder; follow-up handling uses breach count/human paging.
      return 'P0';
    case 'P1':
      return 'P0';
    case 'P2':
      return 'P1';
    case 'P3':
      return 'P2';
    default: {
      const exhaustiveCheck: never = severity;
      throw new Error(`Unsupported severity: ${String(exhaustiveCheck)}`);
    }
  }
};

export interface PullRequestProtectionState {
  readonly isBranchProtected: boolean;
  readonly isCiGreen: boolean;
  readonly humanApprovalCount: number;
}

export const meetsProtectionGateRequirements = (
  decision: RoutingDecision,
  protectionState: PullRequestProtectionState,
): boolean => {
  if (!decision.branchProtectionGate) {
    return true;
  }

  return (
    protectionState.isBranchProtected === decision.branchProtectionGate.requireBranchProtection &&
    protectionState.isCiGreen === decision.branchProtectionGate.requireGreenCi &&
    protectionState.humanApprovalCount >= decision.branchProtectionGate.requireHumanApprovalCount
  );
};
