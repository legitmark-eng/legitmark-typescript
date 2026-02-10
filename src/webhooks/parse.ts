/**
 * Webhook Event Parser
 * 
 * Validates an incoming webhook payload and returns a typed
 * {@link LegitmarkWebhookEvent}. Zero dependencies — pure structural
 * validation and type narrowing.
 */

import {
  LegitmarkWebhookEvent,
  WEBHOOK_EVENT_TYPES,
  WebhookEventType,
} from './types';

const VALID_EVENT_TYPES = new Set<string>(Object.values(WEBHOOK_EVENT_TYPES));

/**
 * Parse and validate an incoming webhook payload.
 * 
 * Checks that the payload has the required shape for its `event_type`
 * and returns a fully typed {@link LegitmarkWebhookEvent}.
 * Throws if the payload is malformed or has an unrecognized event type.
 * 
 * @param payload - Raw webhook body (parsed JSON object)
 * @returns Typed webhook event
 * @throws {Error} If the payload is not a valid webhook event
 * 
 * @example
 * ```typescript
 * import { parseWebhookEvent } from 'legitmark';
 * 
 * app.post('/webhooks/legitmark', express.json(), (req, res) => {
 *   const event = parseWebhookEvent(req.body);
 * 
 *   switch (event.event_type) {
 *     case 'state_change':
 *       console.log(event.state.primary);
 *       break;
 *     case 'media_rejected':
 *       console.log(event.sides);
 *       break;
 *     case 'invalidate_sr':
 *       console.log(event.invalidation_reason.code);
 *       break;
 *   }
 * 
 *   res.status(200).send('OK');
 * });
 * ```
 */
export function parseWebhookEvent(payload: unknown): LegitmarkWebhookEvent {
  if (!isObject(payload)) {
    throw new Error('Webhook payload must be a JSON object');
  }

  const eventType = payload.event_type;

  if (typeof eventType !== 'string' || !VALID_EVENT_TYPES.has(eventType)) {
    throw new Error(
      `Unknown webhook event_type: ${JSON.stringify(eventType)}. ` +
      `Expected one of: ${[...VALID_EVENT_TYPES].join(', ')}`
    );
  }

  assertBaseFields(payload);

  switch (eventType as WebhookEventType) {
    case 'state_change':
      assertStateChangeFields(payload);
      break;

    case 'media_rejected':
      assertMediaRejectedFields(payload);
      break;

    case 'invalidate_sr':
      assertInvalidateSrFields(payload);
      break;
  }

  return payload as unknown as LegitmarkWebhookEvent;
}

function assertBaseFields(obj: Record<string, unknown>): void {
  if (typeof obj.sr_uuid !== 'string') {
    throw new Error('Webhook payload missing required field: sr_uuid');
  }
  if (typeof obj.timestamp !== 'string') {
    throw new Error('Webhook payload missing required field: timestamp');
  }
}

function assertStateChangeFields(obj: Record<string, unknown>): void {
  if (!isObject(obj.state)) {
    throw new Error('state_change event missing required field: state');
  }
  if (typeof obj.state.primary !== 'string') {
    throw new Error('state_change event missing required field: state.primary');
  }
}

function assertMediaRejectedFields(obj: Record<string, unknown>): void {
  if (!Array.isArray(obj.sides)) {
    throw new Error('media_rejected event missing required field: sides');
  }
}

function assertInvalidateSrFields(obj: Record<string, unknown>): void {
  if (!isObject(obj.invalidation_reason)) {
    throw new Error('invalidate_sr event missing required field: invalidation_reason');
  }
  if (typeof obj.invalidation_reason.code !== 'string') {
    throw new Error('invalidate_sr event missing required field: invalidation_reason.code');
  }
  if (typeof obj.invalidation_reason.message !== 'string') {
    throw new Error('invalidate_sr event missing required field: invalidation_reason.message');
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
