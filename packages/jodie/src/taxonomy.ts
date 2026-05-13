import { z } from 'zod';

export const CLASSIFIER_TAXONOMY_VERSION = '2026-05-12.v1';

export const SEVERITY_VALUES = ['P0', 'P1', 'P2', 'P3'] as const;
export const EFFORT_VALUES = ['XS', 'S', 'M', 'L'] as const;
export const AREA_VALUES = ['auth', 'ui', 'db', 'deploy', 'security', 'docs', 'infra'] as const;
export const TYPE_VALUES = ['bug', 'feature', 'ops', 'docs', 'security'] as const;

export const issueClassificationSchema = z
  .object({
    severity: z.enum(SEVERITY_VALUES),
    effort: z.enum(EFFORT_VALUES),
    area: z.enum(AREA_VALUES),
    type: z.enum(TYPE_VALUES),
    confidence: z.number().min(0).max(1),
    rationale: z.string().max(280),
  })
  .strict();

export type IssueSeverity = (typeof SEVERITY_VALUES)[number];
export type IssueEffort = (typeof EFFORT_VALUES)[number];
export type IssueArea = (typeof AREA_VALUES)[number];
export type IssueType = (typeof TYPE_VALUES)[number];
export type IssueClassification = z.infer<typeof issueClassificationSchema>;
