/**
 * A development merge proves implementation landed, not product acceptance.
 * Only an explicitly bounded implementation issue with a reviewer receipt for
 * this exact issue, PR and merge SHA may be closed by the development sweeper.
 */
const LABEL = 'scope:implementation'
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])
const RECEIPT_PREFIX = '<!-- bsuite-development-closure:v2 '

function isSha(value) {
  return typeof value === 'string' && value.length === 40 &&
    [...value.toLowerCase()].every((char) =>
      (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f'))
}

function hasEvidenceUrl(body) {
  return body.split('\n').some((line) => {
    if (!line.startsWith('Evidence: ')) return false
    try {
      const url = new URL(line.slice('Evidence: '.length).trim())
      return url.protocol === 'https:' && url.hostname.length > 0
    } catch { return false }
  })
}

export function closureEligibility(issue, comments, pr) {
  const scopeLabels = (issue.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label.name)?.toLowerCase())
    .filter((name) => name?.startsWith('scope:'))
  if (scopeLabels.length !== 1 || scopeLabels[0] !== LABEL) {
    return { eligible: false, reason: 'scope-not-implementation' }
  }
  if (!Number.isSafeInteger(issue.number) || !Number.isSafeInteger(pr.number) ||
      !isSha(pr.merge_commit_sha) || !pr.user?.login) {
    return { eligible: false, reason: 'invalid-identity' }
  }
  const marker = `${RECEIPT_PREFIX}issue=${issue.number} pr=${pr.number} sha=${pr.merge_commit_sha.toLowerCase()} scope=implementation -->`
  const matching = comments.find((comment) =>
    TRUSTED.has(comment.author_association) &&
    comment.user?.login && comment.user.login !== pr.user.login &&
    typeof comment.body === 'string' &&
    comment.body.split('\n').some((line) => line.trim() === marker) &&
    hasEvidenceUrl(comment.body))
  if (!matching) return { eligible: false, reason: 'missing-exact-trusted-receipt' }
  return { eligible: true, receipt: matching.html_url }
}
