/**
 * AI Configuration for Conduit
 *
 * Model definitions, rate limits, and shared AI configuration.
 * Uses only approved models per AI configuration standards.
 */

export const AI_CONFIG = {
  /** Default model for fast operations (search, filters, simple queries) */
  defaultModel: 'google' as const,
  defaultModelId: 'gemini-2.5-flash-preview-05-20',

  /** Complex model for reasoning tasks (analysis, drafting, scoring) */
  complexModel: 'anthropic' as const,
  complexModelId: 'claude-4-sonnet',

  /** Max tokens per response */
  maxTokens: 4096,

  /** Rate limiting */
  rateLimits: {
    maxRequestsPerMinute: 20,
    maxRequestsPerDay: 500,
  },

  /** Temperature defaults by task type */
  temperatures: {
    search: 0.1,
    analysis: 0.3,
    drafting: 0.7,
    conversation: 0.5,
  },
} as const;

export type ModelProvider = 'google' | 'anthropic';

export interface ModelSelection {
  provider: ModelProvider;
  modelId: string;
  temperature: number;
  maxTokens: number;
}
