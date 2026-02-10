import { describe, it, expect } from 'vitest';

import {
  parseWebhookEvent,
  isAuthentic,
  isCounterfeit,
  isCancelled,
  needsResubmission,
  isQcApproved,
  isAuthenticationInProgress,
  WEBHOOK_EVENT_TYPES,
} from '../src/webhooks';

import {
  FIXTURE_STATE_CHANGE_AUTHENTIC,
  FIXTURE_STATE_CHANGE_COUNTERFEIT,
  FIXTURE_STATE_CHANGE_QC_APPROVED,
  FIXTURE_STATE_CHANGE_UNDERWAY,
  FIXTURE_STATE_CHANGE_CANCELLED,
  FIXTURE_MEDIA_REJECTED,
  FIXTURE_INVALIDATE_SR,
} from './fixtures';

describe('parseWebhookEvent', () => {
  it('parses a valid state_change event', () => {
    const event = parseWebhookEvent(FIXTURE_STATE_CHANGE_AUTHENTIC);
    expect(event.event_type).toBe('state_change');
    expect(event.sr_uuid).toBe('b16c763b-1723-455d-ba29-164418044886');
  });

  it('parses a valid media_rejected event', () => {
    const event = parseWebhookEvent(FIXTURE_MEDIA_REJECTED);
    expect(event.event_type).toBe('media_rejected');
    if (event.event_type === 'media_rejected') {
      expect(event.sides).toHaveLength(2);
      expect(event.sides[0].side).toBe('Front');
    }
  });

  it('parses a valid invalidate_sr event', () => {
    const event = parseWebhookEvent(FIXTURE_INVALIDATE_SR);
    expect(event.event_type).toBe('invalidate_sr');
    if (event.event_type === 'invalidate_sr') {
      expect(event.invalidation_reason.code).toBe('CANCELLED');
    }
  });

  it('accepts null reference_id', () => {
    const event = parseWebhookEvent(FIXTURE_STATE_CHANGE_CANCELLED);
    expect(event.reference_id).toBeNull();
  });

  it('preserves extra fields (forward-compatible)', () => {
    const payload = { ...FIXTURE_STATE_CHANGE_AUTHENTIC, _test: true, new_field: 'future' };
    const event = parseWebhookEvent(payload);
    expect(event.event_type).toBe('state_change');
  });

  describe('rejects invalid payloads', () => {
    it('throws on non-object input', () => {
      expect(() => parseWebhookEvent(null)).toThrow('must be a JSON object');
      expect(() => parseWebhookEvent('string')).toThrow('must be a JSON object');
      expect(() => parseWebhookEvent(42)).toThrow('must be a JSON object');
      expect(() => parseWebhookEvent([])).toThrow('must be a JSON object');
    });

    it('throws on missing event_type', () => {
      expect(() => parseWebhookEvent({ sr_uuid: 'x', timestamp: 'x' }))
        .toThrow('Unknown webhook event_type');
    });

    it('throws on unknown event_type', () => {
      expect(() => parseWebhookEvent({ event_type: 'unknown_event', sr_uuid: 'x', timestamp: 'x' }))
        .toThrow('Unknown webhook event_type');
    });

    it('throws on missing sr_uuid', () => {
      expect(() => parseWebhookEvent({ event_type: 'state_change', timestamp: 'x', state: { primary: 'QC' } }))
        .toThrow('sr_uuid');
    });

    it('throws on missing timestamp', () => {
      expect(() => parseWebhookEvent({ event_type: 'state_change', sr_uuid: 'x', state: { primary: 'QC' } }))
        .toThrow('timestamp');
    });

    it('throws on state_change without state object', () => {
      expect(() => parseWebhookEvent({ event_type: 'state_change', sr_uuid: 'x', timestamp: 'x' }))
        .toThrow('state');
    });

    it('throws on state_change without state.primary', () => {
      expect(() => parseWebhookEvent({
        event_type: 'state_change', sr_uuid: 'x', timestamp: 'x', state: {},
      })).toThrow('state.primary');
    });

    it('throws on media_rejected without sides array', () => {
      expect(() => parseWebhookEvent({ event_type: 'media_rejected', sr_uuid: 'x', timestamp: 'x' }))
        .toThrow('sides');
    });

    it('throws on invalidate_sr without invalidation_reason', () => {
      expect(() => parseWebhookEvent({ event_type: 'invalidate_sr', sr_uuid: 'x', timestamp: 'x' }))
        .toThrow('invalidation_reason');
    });

    it('throws on invalidate_sr with incomplete invalidation_reason', () => {
      expect(() => parseWebhookEvent({
        event_type: 'invalidate_sr', sr_uuid: 'x', timestamp: 'x',
        invalidation_reason: { code: 'X' },
      })).toThrow('invalidation_reason.message');
    });
  });
});

describe('WEBHOOK_EVENT_TYPES', () => {
  it('contains all three event types', () => {
    expect(WEBHOOK_EVENT_TYPES.STATE_CHANGE).toBe('state_change');
    expect(WEBHOOK_EVENT_TYPES.MEDIA_REJECTED).toBe('media_rejected');
    expect(WEBHOOK_EVENT_TYPES.INVALIDATE_SR).toBe('invalidate_sr');
  });
});

describe('isAuthentic', () => {
  it('returns true for COMPLETE + APPROVED', () => {
    expect(isAuthentic(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(true);
  });

  it('returns false for COMPLETE + REJECTED', () => {
    expect(isAuthentic(FIXTURE_STATE_CHANGE_COUNTERFEIT)).toBe(false);
  });

  it('returns false for non-terminal states', () => {
    expect(isAuthentic(FIXTURE_STATE_CHANGE_QC_APPROVED)).toBe(false);
    expect(isAuthentic(FIXTURE_STATE_CHANGE_UNDERWAY)).toBe(false);
  });

  it('returns false for non-state_change events', () => {
    expect(isAuthentic(FIXTURE_MEDIA_REJECTED)).toBe(false);
    expect(isAuthentic(FIXTURE_INVALIDATE_SR)).toBe(false);
  });
});

describe('isCounterfeit', () => {
  it('returns true for COMPLETE + REJECTED', () => {
    expect(isCounterfeit(FIXTURE_STATE_CHANGE_COUNTERFEIT)).toBe(true);
  });

  it('returns false for COMPLETE + APPROVED', () => {
    expect(isCounterfeit(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(false);
  });

  it('returns false for non-state_change events', () => {
    expect(isCounterfeit(FIXTURE_MEDIA_REJECTED)).toBe(false);
  });
});

describe('isCancelled', () => {
  it('returns true for CANCELLED', () => {
    expect(isCancelled(FIXTURE_STATE_CHANGE_CANCELLED)).toBe(true);
  });

  it('returns false for COMPLETE states', () => {
    expect(isCancelled(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(false);
    expect(isCancelled(FIXTURE_STATE_CHANGE_COUNTERFEIT)).toBe(false);
  });

  it('returns false for non-state_change events', () => {
    expect(isCancelled(FIXTURE_MEDIA_REJECTED)).toBe(false);
    expect(isCancelled(FIXTURE_INVALIDATE_SR)).toBe(false);
  });
});

describe('needsResubmission', () => {
  it('returns true for media_rejected events', () => {
    expect(needsResubmission(FIXTURE_MEDIA_REJECTED)).toBe(true);
  });

  it('returns false for other event types', () => {
    expect(needsResubmission(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(false);
    expect(needsResubmission(FIXTURE_INVALIDATE_SR)).toBe(false);
  });
});

describe('isQcApproved', () => {
  it('returns true for QC + APPROVED', () => {
    expect(isQcApproved(FIXTURE_STATE_CHANGE_QC_APPROVED)).toBe(true);
  });

  it('returns false for other states', () => {
    expect(isQcApproved(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(false);
    expect(isQcApproved(FIXTURE_STATE_CHANGE_UNDERWAY)).toBe(false);
  });
});

describe('isAuthenticationInProgress', () => {
  it('returns true for UNDERWAY + ASSIGNED', () => {
    expect(isAuthenticationInProgress(FIXTURE_STATE_CHANGE_UNDERWAY)).toBe(true);
  });

  it('returns false for other states', () => {
    expect(isAuthenticationInProgress(FIXTURE_STATE_CHANGE_QC_APPROVED)).toBe(false);
    expect(isAuthenticationInProgress(FIXTURE_STATE_CHANGE_AUTHENTIC)).toBe(false);
  });
});
