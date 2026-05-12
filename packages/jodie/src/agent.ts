import { createMCPClient, type MCPClient } from '@ai-sdk/mcp'
import { stepCountIs, streamText } from 'ai'
import { defaultJodieMcpToolSchemas, type JodieMcpToolSchemas } from './schemas.js'

interface JodieMcpServerConfig {
  url: string
  headers?: Record<string, string>
}

export interface JodieMcpConfig {
  github: JodieMcpServerConfig
  supabase: JodieMcpServerConfig
  vercel: JodieMcpServerConfig
}

interface JodieAgentRunOptions {
  model: Parameters<typeof streamText>[0]['model']
  prompt: string
  mcp: JodieMcpConfig
  maxSteps?: number
  toolSchemas?: Partial<JodieMcpToolSchemas>
  createClient?: typeof createMCPClient
  streamTextFn?: typeof streamText
}

type DiscoveredToolSet = Record<string, unknown>
type JodieStreamTextResult = ReturnType<typeof streamText>
type JodieEnv = Record<string, string | undefined>

type NamedClients = {
  github: MCPClient
  supabase: MCPClient
  vercel: MCPClient
}

function prefixToolNames(prefix: string, tools: DiscoveredToolSet): DiscoveredToolSet {
  const prefixedEntries = Object.entries(tools).map(([name, tool]) => [`${prefix}__${name}`, tool] as const)
  return Object.fromEntries(prefixedEntries)
}

async function connectMcpClient(name: string, config: JodieMcpServerConfig, createClient: typeof createMCPClient): Promise<MCPClient> {
  return createClient({
    clientName: `jodie-${name}-mcp-client`,
    transport: {
      type: 'http',
      url: config.url,
      headers: config.headers,
      redirect: 'error',
    },
  })
}

async function closeClients(clients: NamedClients): Promise<void> {
  await Promise.allSettled([
    clients.github.close(),
    clients.supabase.close(),
    clients.vercel.close(),
  ])
}

export async function runJodieAgentLoop(options: JodieAgentRunOptions): Promise<JodieStreamTextResult> {
  const createClient = options.createClient ?? createMCPClient
  const streamTextFn = options.streamTextFn ?? streamText

  const clients: NamedClients = {
    github: await connectMcpClient('github', options.mcp.github, createClient),
    supabase: await connectMcpClient('supabase', options.mcp.supabase, createClient),
    vercel: await connectMcpClient('vercel', options.mcp.vercel, createClient),
  }

  try {
    const schemas: JodieMcpToolSchemas = {
      github: options.toolSchemas?.github ?? defaultJodieMcpToolSchemas.github,
      supabase: options.toolSchemas?.supabase ?? defaultJodieMcpToolSchemas.supabase,
      vercel: options.toolSchemas?.vercel ?? defaultJodieMcpToolSchemas.vercel,
    }

    const [githubTools, supabaseTools, vercelTools] = await Promise.all([
      clients.github.tools({ schemas: schemas.github }),
      clients.supabase.tools({ schemas: schemas.supabase }),
      clients.vercel.tools({ schemas: schemas.vercel }),
    ])

    const tools: DiscoveredToolSet = {
      ...prefixToolNames('github', githubTools),
      ...prefixToolNames('supabase', supabaseTools),
      ...prefixToolNames('vercel', vercelTools),
    }

    return streamTextFn({
      model: options.model,
      prompt: options.prompt,
      tools: tools as Parameters<typeof streamText>[0]['tools'],
      stopWhen: stepCountIs(options.maxSteps ?? 10),
    })
  } finally {
    await closeClients(clients)
  }
}

function requiredEnvVar(env: JodieEnv, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getDefaultEnv(): JodieEnv {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as JodieEnv
  }
  return {}
}

export function getJodieMcpConfigFromEnv(env: JodieEnv = getDefaultEnv()): JodieMcpConfig {
  return {
    github: {
      url: requiredEnvVar(env, 'JODIE_MCP_GITHUB_URL'),
      headers: {
        Authorization: `Bearer ${requiredEnvVar(env, 'JODIE_GITHUB_APP_INSTALLATION_TOKEN')}`,
      },
    },
    supabase: {
      url: requiredEnvVar(env, 'JODIE_MCP_SUPABASE_URL'),
      headers: {
        Authorization: `Bearer ${requiredEnvVar(env, 'JODIE_SUPABASE_READONLY_TOKEN')}`,
      },
    },
    vercel: {
      url: requiredEnvVar(env, 'JODIE_MCP_VERCEL_URL'),
      headers: {
        Authorization: `Bearer ${requiredEnvVar(env, 'JODIE_VERCEL_MCP_TOKEN')}`,
      },
    },
  }
}
