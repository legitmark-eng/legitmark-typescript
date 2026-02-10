/**
 * Webhook State Helpers
 * 
 * Convenience functions that encode Legitmark domain knowledge so partners
 * don't need to memorize state combinations.
 * 
 * @see {@link https://docs.legitmark.com/partner/service-request-states} State Reference
 */

import {
  LegitmarkWebhookEvent,
  StateChangeEvent,
} from './types';

const PRIMARY_COMPLETE = 'COMPLETE';
const PRIMARY_CANCELLED = 'CANCELLED';
const PRIMARY_QC = 'QC';
const PRIMARY_UNDERWAY = 'UNDERWAY';
const SUPPLEMENT_APPROVED = 'APPROVED';
const SUPPLEMENT_REJECTED = 'REJECTED';
const SUPPLEMENT_ASSIGNED = 'ASSIGNED';

/**
 * Returns `true` when the item has been authenticated as genuine.
 * 
 * Matches: `state_change` with `COMPLETE + APPROVED`.
 * 
 * @example
 * ```typescript
 * import { parseWebhookEvent, isAuthentic } from 'legitmark';
 * 
 * const event = parseWebhookEvent(req.body);
 * if (isAuthentic(event)) {
 *   markItemAsAuthentic(event.reference_id);
 * }
 * ```
 */
export function isAuthentic(event: LegitmarkWebhookEvent): event is StateChangeEvent {
  return event.event_type === 'state_change'
    && event.state.primary === PRIMARY_COMPLETE
    && event.state.supplement === SUPPLEMENT_APPROVED;
}

/**
 * Returns `true` when the item has been determined to be counterfeit.
 * 
 * Matches: `state_change` with `COMPLETE + REJECTED`.
 */
export function isCounterfeit(event: LegitmarkWebhookEvent): event is StateChangeEvent {
  return event.event_type === 'state_change'
    && event.state.primary === PRIMARY_COMPLETE
    && event.state.supplement === SUPPLEMENT_REJECTED;
}

/**
 * Returns `true` when the service request has been cancelled.
 * 
 * Matches: `state_change` with primary `CANCELLED`.
 */
export function isCancelled(event: LegitmarkWebhookEvent): event is StateChangeEvent {
  return event.event_type === 'state_change'
    && event.state.primary === PRIMARY_CANCELLED;
}

/**
 * Returns `true` when images were rejected and the partner should
 * re-upload photos for the affected sides.
 * 
 * Matches: `media_rejected` events.
 */
export function needsResubmission(event: LegitmarkWebhookEvent): boolean {
  return event.event_type === 'media_rejected';
}

/**
 * Returns `true` when QC has approved the submitted images and the
 * service request is proceeding to authentication.
 * 
 * Matches: `state_change` with `QC + APPROVED`.
 */
export function isQcApproved(event: LegitmarkWebhookEvent): event is StateChangeEvent {
  return event.event_type === 'state_change'
    && event.state.primary === PRIMARY_QC
    && event.state.supplement === SUPPLEMENT_APPROVED;
}

/**
 * Returns `true` when an authenticator has been assigned and
 * authentication is actively in progress.
 * 
 * Matches: `state_change` with `UNDERWAY + ASSIGNED`.
 */
export function isAuthenticationInProgress(event: LegitmarkWebhookEvent): event is StateChangeEvent {
  return event.event_type === 'state_change'
    && event.state.primary === PRIMARY_UNDERWAY
    && event.state.supplement === SUPPLEMENT_ASSIGNED;
}
