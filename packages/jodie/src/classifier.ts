import {
  CLASSIFIER_TAXONOMY_VERSION,
  type IssueArea,
  type IssueClassification,
  type IssueEffort,
  issueClassificationSchema,
  type IssueSeverity,
  type IssueType,
} from './taxonomy.js';

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const DEFAULT_MODEL_ID = 'anthropic/claude-haiku-4';
const MAX_ATTEMPTS = 2;
const MAX_BODY_CHARS = 4000;

const SEVERITY_LABELS = {
  P0: 'jodie:severity:p0',
  P1: 'jodie:severity:p1',
  P2: 'jodie:severity:p2',
  P3: 'jodie:severity:p3',
} as const satisfies Record<IssueSeverity, string>;

const EFFORT_LABELS = {
  XS: 'jodie:effort:xs',
  S: 'jodie:effort:s',
  M: 'jodie:effort:m',
  L: 'jodie:effort:l',
} as const satisfies Record<IssueEffort, string>;

const AREA_LABELS = {
  auth: 'jodie:area:auth',
  ui: 'jodie:area:ui',
  db: 'jodie:area:db',
  deploy: 'jodie:area:deploy',
  security: 'jodie:area:security',
  docs: 'jodie:area:docs',
  infra: 'jodie:area:infra',
} as const satisfies Record<IssueArea, string>;

const TYPE_LABELS = {
  bug: 'jodie:type:bug',
  feature: 'jodie:type:feature',
  ops: 'jodie:type:ops',
  docs: 'jodie:type:docs',
  security: 'jodie:type:security',
} as const satisfies Record<IssueType, string>;

const ROUTE_LABELS = {
  auto: 'jodie:queue:auto-route',
  humanReview: 'jodie:queue:human-review',
} as const;

export type KnownRoutingLabel =
  | (typeof ROUTE_LABELS)[keyof typeof ROUTE_LABELS]
  | (typeof SEVERITY_LABELS)[keyof typeof SEVERITY_LABELS]
  | (typeof EFFORT_LABELS)[keyof typeof EFFORT_LABELS]
  | (typeof AREA_LABELS)[keyof typeof AREA_LABELS]
  | (typeof TYPE_LABELS)[keyof typeof TYPE_LABELS];

export interface ClassifierInput {
  issueUrl: string;
  issueNumber: number;
  repo: string;
  agentRole: string;
  title: string;
  body: string;
  labels: readonly string[];
}

export interface ClassifierTelemetryMetadata {
  issueNumber: number;
  repo: string;
  agentRole: string;
}

export interface ClassifierUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ClassifierModelResponse {
  object: unknown;
  usage?: ClassifierUsage;
  modelId?: string;
}

export interface ClassifierPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface ClassifierOptions {
  modelId?: string;
  confidenceThreshold?: number;
  pricing?: ClassifierPricing;
  generateObject: (params: {
    system: string;
    prompt: string;
    schema: typeof issueClassificationSchema;
    metadata: ClassifierTelemetryMetadata;
  }) => Promise<ClassifierModelResponse>;
}

export interface ClassificationAuditRecord {
  issueUrl: string;
  classification: IssueClassification;
  confidence: number;
  modelId: string;
  taxonomyVersion: string;
  latencyMs: number;
  costUsd: number;
  retryCount: number;
  createdAt: string;
}

export interface ClassificationResult {
  classification: IssueClassification;
  confidenceThreshold: number;
  routingDecision: 'auto-route' | 'human-review';
  routingLabels: readonly KnownRoutingLabel[];
  modelId: string;
  retryCount: number;
  latencyMs: number;
  costUsd: number;
  taxonomyVersion: string;
  auditRecord: ClassificationAuditRecord;
}

const DEFAULT_PRICING: ClassifierPricing = {
  inputUsdPerMillionTokens: 1,
  outputUsdPerMillionTokens: 5,
};

function buildClassifierPrompt(input: ClassifierInput): string {
  const compactBody = input.body.trim().slice(0, MAX_BODY_CHARS);
  const labels = input.labels.join(', ');
  return [
    'Classify this GitHub issue using only the allowed taxonomy values.',
    `Issue URL: ${input.issueUrl}`,
    `Title: ${input.title}`,
    `Body: ${compactBody}`,
    `Labels: ${labels}`,
  ].join('\n');
}

export function buildClassifierSystemPrompt(): string {
  return [
    'You are the BSuite Cron A issue classifier.',
    'Return one object that follows the schema exactly and do not add fields.',
    `Taxonomy version: ${CLASSIFIER_TAXONOMY_VERSION}.`,
    'Routing matrix context:',
    '- severity: P0..P3 where P0 blocks production and P3 is low urgency.',
    '- effort: XS..L using implementation size.',
    '- area: auth/ui/db/deploy/security/docs/infra.',
    '- type: bug/feature/ops/docs/security.',
    '- confidence is 0..1 and should reflect uncertainty.',
    'If uncertain, lower confidence instead of guessing.',
  ].join('\n');
}

function resolveKnownLabels(classification: IssueClassification): readonly KnownRoutingLabel[] {
  return [
    ROUTE_LABELS.auto,
    SEVERITY_LABELS[classification.severity],
    EFFORT_LABELS[classification.effort],
    AREA_LABELS[classification.area],
    TYPE_LABELS[classification.type],
  ];
}

function estimateCostUsd(usage: ClassifierUsage | undefined, pricing: ClassifierPricing): number {
  if (!usage) {
    return 0;
  }

  // Some providers only expose totalTokens; we treat that as input when inputTokens is absent.
  const inputTokens =
    usage.inputTokens ??
    (usage.totalTokens !== undefined
      ? Math.max(usage.totalTokens - (usage.outputTokens ?? 0), 0)
      : 0);
  const outputTokens = usage.outputTokens ?? 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;
  const totalCost = inputCost + outputCost;

  return Number(totalCost.toFixed(6));
}

export async function classifyIssue(
  input: ClassifierInput,
  options: ClassifierOptions
): Promise<ClassificationResult> {
  const startedAt = Date.now();
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const pricing = options.pricing ?? DEFAULT_PRICING;
  const expectedModelId = options.modelId ?? DEFAULT_MODEL_ID;

  let attempts = 0;
  let lastError: unknown;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;

    try {
      const response = await options.generateObject({
        system: buildClassifierSystemPrompt(),
        prompt: buildClassifierPrompt(input),
        schema: issueClassificationSchema,
        metadata: {
          issueNumber: input.issueNumber,
          repo: input.repo,
          agentRole: input.agentRole,
        },
      });

      const parsed = issueClassificationSchema.safeParse(response.object);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => issue.message).join('; ');
        throw new Error(`Schema validation failed: ${issues || 'unknown error'}`);
      }

      const classification = parsed.data;
      const latencyMs = Date.now() - startedAt;
      const modelId = response.modelId ?? expectedModelId;
      const costUsd = estimateCostUsd(response.usage, pricing);
      const routingDecision =
        classification.confidence < confidenceThreshold ? 'human-review' : 'auto-route';

      const routingLabels: readonly KnownRoutingLabel[] =
        routingDecision === 'human-review'
          ? [ROUTE_LABELS.humanReview]
          : resolveKnownLabels(classification);

      const createdAt = new Date().toISOString();

      const auditRecord: ClassificationAuditRecord = {
        issueUrl: input.issueUrl,
        classification,
        confidence: classification.confidence,
        modelId,
        taxonomyVersion: CLASSIFIER_TAXONOMY_VERSION,
        latencyMs,
        costUsd,
        retryCount: attempts - 1,
        createdAt,
      };

      return {
        classification,
        confidenceThreshold,
        routingDecision,
        routingLabels,
        modelId,
        retryCount: attempts - 1,
        latencyMs,
        costUsd,
        taxonomyVersion: CLASSIFIER_TAXONOMY_VERSION,
        auditRecord,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Classification failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`
  );
}
