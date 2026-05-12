import { processGitHubWebhook } from '../../packages/jodie/src/webhook'

export const config = {
  runtime: 'edge',
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    })
  }

  const body = await request.text()

  const result = await processGitHubWebhook({
    headers: request.headers,
    body,
    config: {
      webhookSecret: readRequiredEnv('JODIE_GITHUB_WEBHOOK_SECRET'),
      supabaseUrl: readRequiredEnv('SUPABASE_URL'),
      supabaseServiceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? readRequiredEnv('SUPABASE_SECRET_KEY'),
    },
  })

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
