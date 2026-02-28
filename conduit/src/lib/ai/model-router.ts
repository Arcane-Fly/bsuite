/**
 * Model Router for Conduit AI
 *
 * Routes requests to the appropriate model based on task complexity.
 * Uses approved models only per AI configuration standards.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { AI_CONFIG, type ModelSelection } from './config';

export type TaskComplexity = 'simple' | 'medium' | 'complex';

/**
 * Classify task complexity from the user message and tool usage.
 */
export function classifyComplexity(message: string, toolCount?: number): TaskComplexity {
  const wordCount = message.split(/\s+/).length;

  // Complex: long messages, analysis requests, multi-step reasoning
  const complexIndicators = [
    'analyze', 'compare', 'draft', 'write', 'generate', 'recommend',
    'strategy', 'plan', 'evaluate', 'score', 'rank', 'suggest',
    'bottleneck', 'trend', 'predict', 'summarize report',
  ];
  const hasComplexIndicator = complexIndicators.some((ind) =>
    message.toLowerCase().includes(ind),
  );

  if (hasComplexIndicator || wordCount > 50 || (toolCount && toolCount > 3)) {
    return 'complex';
  }

  // Medium: moderate requests
  const mediumIndicators = [
    'find', 'search', 'list', 'show', 'get', 'filter', 'move',
    'update', 'schedule', 'check',
  ];
  const hasMediumIndicator = mediumIndicators.some((ind) =>
    message.toLowerCase().includes(ind),
  );

  if (hasMediumIndicator || wordCount > 20) {
    return 'medium';
  }

  return 'simple';
}

/**
 * Get model selection based on complexity.
 */
export function getModelSelection(complexity: TaskComplexity): ModelSelection {
  switch (complexity) {
    case 'complex':
      return {
        provider: AI_CONFIG.complexModel,
        modelId: AI_CONFIG.complexModelId,
        temperature: AI_CONFIG.temperatures.analysis,
        maxTokens: AI_CONFIG.maxTokens,
      };
    case 'medium':
      return {
        provider: AI_CONFIG.defaultModel,
        modelId: AI_CONFIG.defaultModelId,
        temperature: AI_CONFIG.temperatures.conversation,
        maxTokens: AI_CONFIG.maxTokens,
      };
    case 'simple':
    default:
      return {
        provider: AI_CONFIG.defaultModel,
        modelId: AI_CONFIG.defaultModelId,
        temperature: AI_CONFIG.temperatures.search,
        maxTokens: 2048,
      };
  }
}

/**
 * Create the AI model instance for a given selection.
 */
export function createModelInstance(selection: ModelSelection) {
  switch (selection.provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(selection.modelId);
    }
    case 'google':
    default: {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(selection.modelId);
    }
  }
}
