import { describe, expect, it, vi } from 'vitest';

import {
  classifyIssue,
  DEFAULT_MODEL_ID,
  type ClassifierModelResponse,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from './classifier.js';
import {
  AREA_VALUES,
  EFFORT_VALUES,
  SEVERITY_VALUES,
  TYPE_VALUES,
  issueClassificationSchema,
} from './taxonomy.js';

const baseInput = {
  issueUrl: 'https://github.com/GaryOcean428/bsuite/issues/551',
  title: 'Synthetic issue',
  body: 'Synthetic body',
  labels: ['jodie-ai'],
};

function validResponse(overrides?: Partial<ClassifierModelResponse>): ClassifierModelResponse {
  return {
    object: {
      severity: 'P1',
      effort: 'M',
      area: 'infra',
      type: 'ops',
      confidence: 0.91,
      rationale: 'Synthetic rationale',
    },
    usage: {
      inputTokens: 100,
      outputTokens: 50,
    },
    modelId: DEFAULT_MODEL_ID,
    ...overrides,
  };
}

describe('classifyIssue', () => {
  it('validates all 4×4×7×5 taxonomy combinations from synthetic issues', async () => {
    const seen = new Set<string>();

    for (const severity of SEVERITY_VALUES) {
      for (const effort of EFFORT_VALUES) {
        for (const area of AREA_VALUES) {
          for (const type of TYPE_VALUES) {
            const comboObject = {
              severity,
              effort,
              area,
              type,
              confidence: 0.8,
              rationale: `Synthetic combo ${severity}/${effort}/${area}/${type}`,
            };

            const result = await classifyIssue(baseInput, {
              generateObject: async () => validResponse({ object: comboObject }),
            });

            expect(issueClassificationSchema.parse(result.classification)).toEqual(comboObject);
            expect(result.routingDecision).toBe('auto-route');
            expect(result.routingLabels[0]).toBe('jodie:queue:auto-route');

            seen.add(`${severity}|${effort}|${area}|${type}`);
          }
        }
      }
    }

    expect(seen.size).toBe(
      SEVERITY_VALUES.length * EFFORT_VALUES.length * AREA_VALUES.length * TYPE_VALUES.length
    );
  });

  it('routes low-confidence results to human review', async () => {
    const result = await classifyIssue(baseInput, {
      generateObject: async () =>
        validResponse({
          object: {
            severity: 'P3',
            effort: 'XS',
            area: 'docs',
            type: 'docs',
            confidence: 0.69,
            rationale: 'Not enough context',
          },
        }),
    });

    expect(result.confidenceThreshold).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
    expect(result.routingDecision).toBe('human-review');
    expect(result.routingLabels).toEqual(['jodie:queue:human-review']);
  });

  it('retries exactly once when hallucinated schema values are returned', async () => {
    const generateObject = vi
      .fn<() => Promise<ClassifierModelResponse>>()
      .mockResolvedValueOnce(
        validResponse({
          object: {
            severity: 'P9',
            effort: 'XL',
            area: 'made-up',
            type: 'weird',
            confidence: 1,
            rationale: 'hallucination',
          },
        })
      )
      .mockResolvedValueOnce(validResponse());

    const result = await classifyIssue(baseInput, { generateObject });

    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(result.retryCount).toBe(1);
    expect(result.routingDecision).toBe('auto-route');
  });

  it('computes latency and cost metadata for audit persistence', async () => {
    const result = await classifyIssue(baseInput, {
      pricing: {
        inputUsdPerMillionTokens: 2,
        outputUsdPerMillionTokens: 6,
      },
      generateObject: async () => validResponse(),
    });

    expect(result.modelId).toBe(DEFAULT_MODEL_ID);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.costUsd).toBe(0.0005);
    expect(result.auditRecord.costUsd).toBe(0.0005);
    expect(result.auditRecord.issueUrl).toBe(baseInput.issueUrl);
  });

  it('keeps synthetic p95 latency under 3s', async () => {
    const samples: number[] = [];

    for (let index = 0; index < 50; index += 1) {
      const result = await classifyIssue(baseInput, {
        generateObject: async () => validResponse(),
      });
      samples.push(result.latencyMs);
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const p95Index = Math.floor(sorted.length * 0.95) - 1;
    const p95 = sorted[Math.max(p95Index, 0)] ?? 0;

    expect(p95).toBeLessThan(3000);
  });
});
