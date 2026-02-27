/**
 * AI Tool Registry — Conduit
 *
 * Central registry of all AI tools available to Jodie in Conduit.
 * Mirrors the CRM7 factory pattern with ToolExecutionContext.
 */

import type { Tool } from 'ai';

import { createCandidateTools } from './candidate-tools';
import { createPipelineTools } from './pipeline-tools';
import { createJobTools } from './job-tools';
import { createInterviewTools } from './interview-tools';
import { createAnalyticsTools } from './analytics-tools';
import { createCommunicationTools } from './communication-tools';

/**
 * Tool execution context passed to all tools
 */
export interface ToolExecutionContext {
  tenantId: string;
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Standard tool result format
 */
export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Create tool registry bound to execution context.
 */
export function createToolRegistry(context: ToolExecutionContext): Record<string, Tool> {
  return {
    ...createCandidateTools(context),
    ...createPipelineTools(context),
    ...createJobTools(context),
    ...createInterviewTools(context),
    ...createAnalyticsTools(context),
    ...createCommunicationTools(context),
  };
}

/**
 * Get all available tool names (context-independent).
 */
export function getAllToolNames(): string[] {
  return [
    // Candidate tools (7)
    'search_candidates',
    'get_candidate_profile',
    'filter_candidates',
    'update_candidate_status',
    'add_candidate_to_pool',
    'score_candidate',
    'suggest_candidates_for_job',
    // Pipeline tools (5)
    'get_pipeline_overview',
    'move_candidate_in_pipeline',
    'add_to_pipeline',
    'get_stage_candidates',
    'pipeline_bottleneck_analysis',
    // Job tools (4)
    'search_jobs',
    'get_job_applications',
    'draft_job_description',
    'get_job_metrics',
    // Interview tools (4)
    'schedule_interview',
    'get_upcoming_interviews',
    'cancel_interview',
    'suggest_interview_times',
    // Analytics tools (3)
    'recruitment_summary',
    'source_effectiveness',
    'compliance_overview',
    // Communication tools (2)
    'send_candidate_email',
    'draft_outreach',
  ];
}
