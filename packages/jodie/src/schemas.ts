import { z } from 'zod'

export const githubToolSchemas = {
  issue_read: {
    inputSchema: z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      method: z.enum(['get', 'get_comments', 'get_sub_issues', 'get_labels']),
      issue_number: z.number().int().positive(),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
  pull_request_read: {
    inputSchema: z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      pullNumber: z.number().int().positive(),
      method: z.enum(['get', 'get_diff', 'get_status', 'get_files', 'get_review_comments', 'get_reviews', 'get_comments', 'get_check_runs']),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
  issue_write: {
    inputSchema: z.object({
      owner: z.string().min(1),
      repo: z.string().min(1),
      method: z.enum(['add_comment']),
      issue_number: z.number().int().positive(),
      body: z.string().min(1),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
} as const

export const supabaseToolSchemas = {
  execute_sql: {
    inputSchema: z.object({
      project_id: z.string().min(1),
      query: z.string().min(1),
      read_only: z.literal(true).default(true),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
} as const

export const vercelToolSchemas = {
  list_deployments: {
    inputSchema: z.object({
      projectId: z.string().min(1),
      limit: z.number().int().positive().max(100).optional(),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
  get_deployment: {
    inputSchema: z.object({
      deploymentId: z.string().min(1),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
  get_deployment_logs: {
    inputSchema: z.object({
      deploymentId: z.string().min(1),
      limit: z.number().int().positive().max(1000).optional(),
    }),
    outputSchema: z.record(z.string(), z.unknown()),
  },
} as const

export interface JodieMcpToolSchemas {
  github: typeof githubToolSchemas
  supabase: typeof supabaseToolSchemas
  vercel: typeof vercelToolSchemas
}

export const defaultJodieMcpToolSchemas: JodieMcpToolSchemas = {
  github: githubToolSchemas,
  supabase: supabaseToolSchemas,
  vercel: vercelToolSchemas,
}
