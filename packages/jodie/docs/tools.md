# Jodie MCP Tool Inventory

Jodie wires three MCP servers into the agent loop via `createMCPClient` with HTTP transport (`redirect: "error"`) and explicitly typed tool schemas (`inputSchema` + `outputSchema`) for each allowed tool.

## GitHub MCP (`github/github-mcp-server`)

Authentication: **GitHub App installation token only** (`JODIE_GITHUB_APP_INSTALLATION_TOKEN`). PATs are not supported.

| Tool | Purpose | Input schema | Output schema |
|---|---|---|---|
| `issue_read` | Read issue details/comments/labels/sub-issues | owner, repo, method, issue_number | structured object map |
| `pull_request_read` | Read PR metadata/files/reviews/comments/checks | owner, repo, pullNumber, method | structured object map |
| `issue_write` | Comment on or open an issue | owner, repo, method (discriminated): `add_comment` → issue_number, body · `create_issue` → title, body, optional labels[] | structured object map |

> `issue_write` accepts two methods (discriminated union on `method`): `add_comment` posts to an existing issue; `create_issue` opens a new issue with a title, body, and optional labels. `create_issue` powers the Documentation Program's docs-gap feedback loop — an AI-licensed user asks Jodie to flag missing documentation and Jodie files an issue on the docs repo. Added in `@bsuite/jodie` 0.2.0.

## Supabase MCP (`supabase-community/supabase-mcp`)

Authentication: read-only token (`JODIE_SUPABASE_READONLY_TOKEN`).

| Tool | Purpose | Input schema | Output schema |
|---|---|---|---|
| `execute_sql` | Query read-only DB context (`SELECT`) | project_id, query, read_only=true | structured object map |

## Vercel MCP (`vercel/mcp-server`)

Authentication: Vercel MCP token (`JODIE_VERCEL_MCP_TOKEN`).

| Tool | Purpose | Input schema | Output schema |
|---|---|---|---|
| `list_deployments` | Read recent deployments | projectId, optional limit | structured object map |
| `get_deployment` | Read deployment status | deploymentId | structured object map |
| `get_deployment_logs` | Read recent deployment logs | deploymentId, optional limit | structured object map |

## Tool-name prefixing in Jodie loop

To prevent collisions between server tool names, Jodie prefixes all tools before passing them to `streamText`:

- `github__*`
- `supabase__*`
- `vercel__*`

## Lifecycle safety

The agent loop always closes all MCP clients through `try/finally`, even on stream/tool errors.
