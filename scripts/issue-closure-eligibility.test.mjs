import assert from 'node:assert/strict'
import test from 'node:test'
import { closureEligibility } from './issue-closure-eligibility.mjs'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const PR = { number: 456, merge_commit_sha: SHA, merged_at: '2026-09-24T00:00:00Z', user: { login: 'implementer' } }
const ISSUE = { number: 123, labels: [{ name: 'scope:implementation' }] }
const RECEIPT = {
  author_association: 'MEMBER',
  user: { login: 'reviewer' },
  created_at: '2026-09-24T00:01:00Z',
  html_url: 'https://github.com/Arcane-Fly/bsuite/issues/123#issuecomment-1',
  body: `<!-- bsuite-development-closure:v2 issue=123 pr=456 sha=${SHA} scope=implementation -->\nEvidence: https://github.com/Arcane-Fly/bsuite/pull/456`,
}

test('eligibility fails closed for product scope, conflicting scope, missing or stale receipt', () => {
  assert.equal(closureEligibility({ ...ISSUE, labels: [] }, [RECEIPT], PR).eligible, false)
  assert.equal(closureEligibility({ ...ISSUE, labels: ['scope:implementation', 'scope:product'] }, [RECEIPT], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [], PR).reason, 'missing-exact-trusted-receipt')
  assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, author_association: 'NONE' }], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, user: PR.user }], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, created_at: '2026-09-23T23:59:00Z' }], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, created_at: undefined }], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [RECEIPT], { ...PR, number: 457 }).eligible, false)
  assert.equal(closureEligibility(ISSUE, [RECEIPT], { ...PR, merge_commit_sha: 'f'.repeat(40) }).eligible, false)
  assert.equal(closureEligibility({ ...ISSUE, number: 124 }, [RECEIPT], PR).eligible, false)
  assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, body: RECEIPT.body.replace('Evidence: https:', 'Evidence: http:') }], PR).eligible, false)
})

test('a trusted exact implementation receipt is eligible', () => {
  assert.deepEqual(closureEligibility(ISSUE, [RECEIPT], PR),
    { eligible: true, receipt: RECEIPT.html_url })
})

test('quoted, fenced and prose receipt examples are not acceptance', () => {
  for (const body of [
    `Example only:\n\`\`\`text\n${RECEIPT.body}\n\`\`\``,
    RECEIPT.body.split('\n').map((line) => `> ${line}`).join('\n'),
    `This is an example, not acceptance.\n${RECEIPT.body}`,
    `${RECEIPT.body}\nThis is an example, not acceptance.`,
  ]) {
    assert.equal(closureEligibility(ISSUE, [{ ...RECEIPT, body }], PR).eligible, false)
  }
})

async function runCloser({ labels, comments, events = [] }) {
  const savedFetch = globalThis.fetch
  const savedEnv = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    CLOSER_SCOPES: process.env.CLOSER_SCOPES,
    CLOSER_LOOKBACK_HOURS: process.env.CLOSER_LOOKBACK_HOURS,
    CLOSER_DRY_RUN: process.env.CLOSER_DRY_RUN,
  }
  const writes = []
  const now = new Date().toISOString()
  const pr = { ...PR, body: 'Closes #123', merged_at: now, updated_at: now }
  const apiComments = comments.map((comment) => comment.body?.includes('bsuite-development-closure:v2')
    ? { ...comment, created_at: new Date(Date.parse(now) + 1000).toISOString() }
    : comment)
  const response = (data) => ({ ok: true, status: 200, json: async () => data })
  process.env.GITHUB_TOKEN = 'fixture-token'
  process.env.CLOSER_SCOPES = 'Arcane-Fly/bsuite'
  process.env.CLOSER_LOOKBACK_HOURS = '2'
  process.env.CLOSER_DRY_RUN = '0'
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname
    if (init.method === 'POST' || init.method === 'PATCH') {
      writes.push({ path, method: init.method, body: JSON.parse(init.body) })
      return response({})
    }
    if (path === '/repos/Arcane-Fly/bsuite') return response({ default_branch: 'main', has_issues: true, permissions: {} })
    if (path === '/repos/Arcane-Fly/bsuite/pulls') return response(new URL(url).searchParams.get('page') === '1' ? [pr] : [])
    if (path === '/repos/Arcane-Fly/bsuite/issues/123') return response({ ...ISSUE, state: 'open', labels })
    if (path === '/repos/Arcane-Fly/bsuite/issues/123/comments') return response(apiComments)
    if (path === '/repos/Arcane-Fly/bsuite/issues/123/events') return response(events)
    throw new Error(`Unexpected fixture request: ${path}`)
  }
  try {
    await import(`./close-merged-development-issues.mjs?fixture=${Math.random()}`)
    return writes
  } finally {
    globalThis.fetch = savedFetch
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('actual development closer leaves an unreceipted product issue open', async () => {
  assert.deepEqual(await runCloser({ labels: [], comments: [] }), [])
})

test('actual development closer leaves bounded scope open without a receipt', async () => {
  assert.deepEqual(await runCloser({ labels: ISSUE.labels, comments: [] }), [])
})

test('actual development closer ignores a fenced receipt example', async () => {
  const example = { ...RECEIPT, body: `Example only:\n\`\`\`text\n${RECEIPT.body}\n\`\`\`` }
  assert.deepEqual(await runCloser({ labels: ISSUE.labels, comments: [example] }), [])
})

test('actual development closer comments then closes accepted implementation scope', async () => {
  const writes = await runCloser({ labels: ISSUE.labels, comments: [RECEIPT] })
  assert.deepEqual(writes.map((call) => call.method), ['POST', 'PATCH'])
  assert.match(writes[0].body.body, /Accepted|Acceptance receipt/)
  assert.equal(writes[1].body.state, 'closed')
  assert.equal(writes[1].body.state_reason, 'completed')
})

test('actual development closer respects a prior closure marker after reopening', async () => {
  const previous = { body: '<!-- bsuite-development-merge-closer:v1 pr=456 -->', created_at: '2026-09-24T00:00:00Z' }
  const closed = { event: 'closed', created_at: '2026-09-24T00:01:00Z' }
  assert.deepEqual(await runCloser({ labels: ISSUE.labels, comments: [RECEIPT, previous], events: [closed] }), [])
})

test('actual development closer retries PATCH after comment-first partial failure', async () => {
  const previous = { body: '<!-- bsuite-development-merge-closer:v1 pr=456 -->', created_at: '2026-09-24T00:00:00Z' }
  const writes = await runCloser({ labels: ISSUE.labels, comments: [RECEIPT, previous] })
  assert.deepEqual(writes.map((call) => call.method), ['PATCH'])
})
