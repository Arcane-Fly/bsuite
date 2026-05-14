import { describe, expect, it, vi } from 'vitest'
import { runJodieAgentLoop, getJodieMcpConfigFromEnv, type JodieMcpConfig } from '../agent.js'

interface ExecutableTool {
  execute: (input: unknown) => Promise<unknown>
}

type StreamTextFn = NonNullable<Parameters<typeof runJodieAgentLoop>[0]['streamTextFn']>
type StreamTextArgs = Parameters<StreamTextFn>[0]
type StreamTextResult = Awaited<ReturnType<StreamTextFn>>

function executable(tool: unknown): ExecutableTool {
  if (typeof tool === 'object' && tool !== null && 'execute' in tool) {
    const execute = (tool as { execute: ExecutableTool['execute'] }).execute
    return { execute }
  }

  throw new Error('Tool does not implement execute()')
}

function createMockMcpClient(toolNames: string[], callLog: string[]) {
  const close = vi.fn(async () => undefined)
  const toolSet = Object.fromEntries(
    toolNames.map((toolName) => [
      toolName,
      {
        description: toolName,
        inputSchema: {},
        execute: async () => {
          callLog.push(toolName)
          return { ok: true }
        },
      },
    ]),
  )

  const tools = vi.fn(async () => ({
    ...toolSet,
  }))

  return {
    close,
    tools,
  }
}

describe('runJodieAgentLoop', () => {
  it('runs the issue→supabase→pr→comment MCP sequence and closes all clients', async () => {
    const callLog: string[] = []

    const githubClient = createMockMcpClient(['issue_read', 'pull_request_read', 'issue_write'], callLog)
    const supabaseClient = createMockMcpClient(['execute_sql'], callLog)
    const vercelClient = createMockMcpClient(['get_deployment'], callLog)

    const createdClients = [githubClient, supabaseClient, vercelClient]
    const createClient = (vi.fn(async () => createdClients.shift() as unknown) as unknown) as NonNullable<
      Parameters<typeof runJodieAgentLoop>[0]['createClient']
    >

    const streamTextFn = vi.fn((options: StreamTextArgs) => {
      if (!options.tools) {
        throw new Error('Tools are required')
      }

      const issueTool = executable(options.tools.github__issue_read)
      const sqlTool = executable(options.tools.supabase__execute_sql)
      const prTool = executable(options.tools.github__pull_request_read)
      const commentTool = executable(options.tools.github__issue_write)
      const deployTool = executable(options.tools.vercel__get_deployment)

      void issueTool.execute({ issue_number: 1 })
      void sqlTool.execute({ query: 'select 1' })
      void prTool.execute({ pullNumber: 2 })
      void commentTool.execute({ issue_number: 1, body: 'done' })
      void deployTool.execute({ deploymentId: 'dep_123' })

      return ({ finishReason: 'stop' } as unknown) as StreamTextResult
    })

    const config: JodieMcpConfig = {
      github: { url: 'https://github.example/mcp' },
      supabase: { url: 'https://supabase.example/mcp' },
      vercel: { url: 'https://vercel.example/mcp' },
    }

    await runJodieAgentLoop({
      model: { modelId: 'test-model', provider: 'test-provider', specificationVersion: 'v2' } as Parameters<typeof runJodieAgentLoop>[0]['model'],
      prompt: 'Do the Jodie MCP flow',
      mcp: config,
      createClient,
      streamTextFn: (streamTextFn as unknown) as StreamTextFn,
    })

    expect(createClient).toHaveBeenCalledTimes(3)
    expect(githubClient.close).toHaveBeenCalledTimes(1)
    expect(supabaseClient.close).toHaveBeenCalledTimes(1)
    expect(vercelClient.close).toHaveBeenCalledTimes(1)
    expect(callLog).toContain('issue_read')
    expect(callLog).toContain('pull_request_read')
    expect(callLog).toContain('issue_write')
    expect(callLog).toContain('execute_sql')
    expect(callLog).toContain('get_deployment')
  })

  it('closes all MCP clients even when streamText fails', async () => {
    const githubClient = createMockMcpClient(['issue_read'], [])
    const supabaseClient = createMockMcpClient(['execute_sql'], [])
    const vercelClient = createMockMcpClient(['get_deployment'], [])

    const createdClients = [githubClient, supabaseClient, vercelClient]

    await expect(
      runJodieAgentLoop({
        model: { modelId: 'test-model', provider: 'test-provider', specificationVersion: 'v2' } as Parameters<typeof runJodieAgentLoop>[0]['model'],
        prompt: 'fail',
        mcp: {
          github: { url: 'https://github.example/mcp' },
          supabase: { url: 'https://supabase.example/mcp' },
          vercel: { url: 'https://vercel.example/mcp' },
        },
        createClient: (vi.fn(async () => createdClients.shift() as unknown) as unknown) as NonNullable<
          Parameters<typeof runJodieAgentLoop>[0]['createClient']
        >,
        streamTextFn: (vi.fn(() => {
          throw new Error('stream failed')
        }) as unknown) as StreamTextFn,
      }),
    ).rejects.toThrow('stream failed')

    expect(githubClient.close).toHaveBeenCalledTimes(1)
    expect(supabaseClient.close).toHaveBeenCalledTimes(1)
    expect(vercelClient.close).toHaveBeenCalledTimes(1)
  })
})

describe('getJodieMcpConfigFromEnv', () => {
  it('builds MCP config from GitHub App + Supabase + Vercel tokens', () => {
    const config = getJodieMcpConfigFromEnv({
      JODIE_MCP_GITHUB_URL: 'https://github.example/mcp',
      JODIE_GITHUB_APP_INSTALLATION_TOKEN: 'ghs_token',
      JODIE_MCP_SUPABASE_URL: 'https://supabase.example/mcp',
      JODIE_SUPABASE_READONLY_TOKEN: 'supa_ro',
      JODIE_MCP_VERCEL_URL: 'https://vercel.example/mcp',
      JODIE_VERCEL_MCP_TOKEN: 'vercel_token',
    })

    expect(config.github.headers?.Authorization).toBe('Bearer ghs_token')
    expect(config.supabase.headers?.Authorization).toBe('Bearer supa_ro')
    expect(config.vercel.headers?.Authorization).toBe('Bearer vercel_token')
  })

  it('throws when a required variable is missing', () => {
    expect(() => getJodieMcpConfigFromEnv({})).toThrow('Missing required environment variable')
  })
})
