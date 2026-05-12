export type JodieWebhookEventKey =
  | 'issues.opened'
  | 'issues.assigned'
  | 'issue_comment.created'
  | 'pull_request.opened'
  | 'pull_request.review_requested'

export interface JodieWebhookEnvelope {
  eventName: string
  action: string | null
  payload: Record<string, unknown>
}

export interface JodieWebhookHandlerResult {
  eventKey: JodieWebhookEventKey
  payload: Record<string, unknown>
}

export type JodieWebhookEventHandler = (
  envelope: JodieWebhookEnvelope,
) => JodieWebhookHandlerResult

export function toWebhookEventKey(eventName: string, action: string | null): JodieWebhookEventKey | null {
  if (eventName === 'issues' && action === 'opened') {
    return 'issues.opened'
  }

  if (eventName === 'issues' && action === 'assigned') {
    return 'issues.assigned'
  }

  if (eventName === 'issue_comment' && action === 'created') {
    return 'issue_comment.created'
  }

  if (eventName === 'pull_request' && action === 'opened') {
    return 'pull_request.opened'
  }

  if (eventName === 'pull_request' && action === 'review_requested') {
    return 'pull_request.review_requested'
  }

  return null
}

function passthroughHandler(eventKey: JodieWebhookEventKey): JodieWebhookEventHandler {
  return (envelope) => ({
    eventKey,
    payload: envelope.payload,
  })
}

const handlers: Record<JodieWebhookEventKey, JodieWebhookEventHandler> = {
  'issues.opened': passthroughHandler('issues.opened'),
  'issues.assigned': passthroughHandler('issues.assigned'),
  'issue_comment.created': passthroughHandler('issue_comment.created'),
  'pull_request.opened': passthroughHandler('pull_request.opened'),
  'pull_request.review_requested': passthroughHandler('pull_request.review_requested'),
}

export function dispatchWebhookEvent(
  eventName: string,
  action: string | null,
  payload: Record<string, unknown>,
): JodieWebhookHandlerResult | null {
  const eventKey = toWebhookEventKey(eventName, action)

  if (!eventKey) {
    return null
  }

  return handlers[eventKey]({
    eventName,
    action,
    payload,
  })
}
