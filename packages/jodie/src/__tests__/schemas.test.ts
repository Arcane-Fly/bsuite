import { describe, expect, it } from 'vitest'
import { githubToolSchemas } from '../schemas.js'

describe('githubToolSchemas.issue_write', () => {
  const { inputSchema } = githubToolSchemas.issue_write

  it('accepts the add_comment method (existing behaviour)', () => {
    const parsed = inputSchema.parse({
      owner: 'GaryOcean428',
      repo: 'bsuite',
      method: 'add_comment',
      issue_number: 42,
      body: 'Verified and closing.',
    })

    expect(parsed).toMatchObject({ method: 'add_comment', issue_number: 42 })
  })

  it('accepts the create_issue method with a title and body', () => {
    const parsed = inputSchema.parse({
      owner: 'GaryOcean428',
      repo: 'bsuite',
      method: 'create_issue',
      title: 'Docs gap: Employee guide missing leave section',
      body: 'The Employee manual does not cover applying for leave.',
    })

    expect(parsed).toMatchObject({
      method: 'create_issue',
      title: 'Docs gap: Employee guide missing leave section',
    })
  })

  it('accepts create_issue with an optional labels array', () => {
    const parsed = inputSchema.parse({
      owner: 'GaryOcean428',
      repo: 'bsuite',
      method: 'create_issue',
      title: 'Docs gap',
      body: 'Missing content.',
      labels: ['docs', 'docs-gap'],
    })

    expect(parsed).toMatchObject({ method: 'create_issue', labels: ['docs', 'docs-gap'] })
  })

  it('rejects create_issue without a title', () => {
    expect(() =>
      inputSchema.parse({
        owner: 'GaryOcean428',
        repo: 'bsuite',
        method: 'create_issue',
        body: 'Missing content.',
      }),
    ).toThrow()
  })

  it('rejects add_comment without an issue_number', () => {
    expect(() =>
      inputSchema.parse({
        owner: 'GaryOcean428',
        repo: 'bsuite',
        method: 'add_comment',
        body: 'orphan comment',
      }),
    ).toThrow()
  })

  it('rejects an unknown method', () => {
    expect(() =>
      inputSchema.parse({
        owner: 'GaryOcean428',
        repo: 'bsuite',
        method: 'close_issue',
        issue_number: 1,
      }),
    ).toThrow()
  })

  it('keeps the output schema as an open record', () => {
    const parsed = githubToolSchemas.issue_write.outputSchema.parse({
      number: 101,
      html_url: 'https://github.com/GaryOcean428/bsuite/issues/101',
    })

    expect(parsed).toMatchObject({ number: 101 })
  })
})
