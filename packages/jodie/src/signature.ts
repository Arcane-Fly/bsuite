import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_PREFIX = 'sha256='

export function verifyGitHubWebhookSignature(params: {
  webhookSecret: string
  payload: string
  signatureHeader: string | null
}): boolean {
  const { webhookSecret, payload, signatureHeader } = params

  if (!signatureHeader) {
    return false
  }

  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false
  }

  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length)
  const expectedHex = createHmac('sha256', webhookSecret).update(payload).digest('hex')

  if (providedHex.length !== expectedHex.length) {
    return false
  }

  try {
    const provided = Buffer.from(providedHex, 'hex')
    const expected = Buffer.from(expectedHex, 'hex')

    if (provided.length !== expected.length) {
      return false
    }

    return timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}
