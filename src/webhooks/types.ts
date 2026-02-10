/**
 * Webhook Event Types
 * 
 * Typed payloads for all Legitmark webhook events.
 * Use the discriminated union {@link LegitmarkWebhookEvent} to handle events
 * with full type safety.
 * 
 * @see {@link https://docs.legitmark.com/webhook-reference/events} Event Reference
 * 
 * @example
 * ```typescript
 * import { type LegitmarkWebhookEvent } from 'legitmark';
 * 
 * function handleWebhook(event: LegitmarkWebhookEvent) {
 *   switch (event.event_type) {
 *     case 'state_change':
 *       console.log(event.state.primary); // fully typed
 *       break;
 *     case 'media_rejected':
 *       console.log(event.sides);         // typed as RejectedSide[]
 *       break;
 *     case 'invalidate_sr':
 *       console.log(event.invalidation_reason.code);
 *       break;
 *   }
 * }
 * ```
 */

/**
 * Event type identifiers for all Legitmark webhook events.
 */
export const WEBHOOK_EVENT_TYPES = {
  STATE_CHANGE: 'state_change',
  MEDIA_REJECTED: 'media_rejected',
  INVALIDATE_SR: 'invalidate_sr',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES];

interface WebhookEventBase {
  /** Service request UUID */
  readonly sr_uuid: string;
  /** Partner's internal item ID (the external_id set when creating the SR) */
  readonly reference_id: string | null;
  /** ISO 8601 timestamp of when the event occurred */
  readonly timestamp: string;
}

/**
 * Emitted when a service request transitions to a new state.
 * 
 * The `state` field uses the same two-part system as the SR model:
 * - `primary` — main workflow stage (QC, UNDERWAY, COMPLETE, etc.)
 * - `supplement` — additional context (APPROVED, REJECTED, PENDING, etc.)
 * 
 * Common terminal states:
 * - `COMPLETE + APPROVED` → item is authentic
 * - `COMPLETE + REJECTED` → item is not authentic
 * 
 * @see {@link https://docs.legitmark.com/webhook-reference/events#state_change}
 */
export interface StateChangeEvent extends WebhookEventBase {
  readonly event_type: 'state_change';
  readonly state: {
    readonly primary: string;
    readonly supplement: string | null;
  };
}

/**
 * A single side whose uploaded image was rejected during quality control.
 */
export interface RejectedSide {
  /** Name of the side (e.g. "Front", "Back", "Label") */
  readonly side: string;
  /** Machine-readable rejection reason */
  readonly reason: string;
  /** User-friendly guidance for re-upload */
  readonly message?: string;
}

/**
 * Emitted when uploaded images are rejected during quality control.
 * Contains per-side feedback so the partner knows which images to re-upload.
 * 
 * @see {@link https://docs.legitmark.com/webhook-reference/events#media_rejected}
 */
export interface MediaRejectedEvent extends WebhookEventBase {
  readonly event_type: 'media_rejected';
  readonly sides: readonly RejectedSide[];
}

/**
 * Emitted when a service request is cancelled or cannot be processed.
 * 
 * @see {@link https://docs.legitmark.com/webhook-reference/events#invalidate_sr}
 */
export interface InvalidateSrEvent extends WebhookEventBase {
  readonly event_type: 'invalidate_sr';
  readonly invalidation_reason: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Union of all Legitmark webhook event types.
 * 
 * Discriminated on `event_type` — use a `switch` or `if` check to narrow
 * the type and get full autocomplete on event-specific fields.
 * 
 * @example
 * ```typescript
 * import { parseWebhookEvent } from 'legitmark';
 * 
 * const event = parseWebhookEvent(req.body);
 * 
 * if (event.event_type === 'state_change') {
 *   // TypeScript knows this is StateChangeEvent
 *   console.log(event.state.primary);
 * }
 * ```
 */
export type LegitmarkWebhookEvent =
  | StateChangeEvent
  | MediaRejectedEvent
  | InvalidateSrEvent;
