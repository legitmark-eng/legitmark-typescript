import type { LegitmarkWebhookEvent } from '../../src/webhooks';

const SR_UUID = 'b16c763b-1723-455d-ba29-164418044886';
const TIMESTAMP = '2026-02-10T12:00:00.000Z';

export const FIXTURE_STATE_CHANGE_AUTHENTIC: LegitmarkWebhookEvent = {
  event_type: 'state_change',
  sr_uuid: SR_UUID,
  reference_id: 'PARTNER-ITEM-123',
  state: { primary: 'COMPLETE', supplement: 'APPROVED' },
  timestamp: TIMESTAMP,
};

export const FIXTURE_STATE_CHANGE_COUNTERFEIT: LegitmarkWebhookEvent = {
  event_type: 'state_change',
  sr_uuid: SR_UUID,
  reference_id: 'PARTNER-ITEM-456',
  state: { primary: 'COMPLETE', supplement: 'REJECTED' },
  timestamp: TIMESTAMP,
};

export const FIXTURE_STATE_CHANGE_QC_APPROVED: LegitmarkWebhookEvent = {
  event_type: 'state_change',
  sr_uuid: SR_UUID,
  reference_id: null,
  state: { primary: 'QC', supplement: 'APPROVED' },
  timestamp: TIMESTAMP,
};

export const FIXTURE_STATE_CHANGE_UNDERWAY: LegitmarkWebhookEvent = {
  event_type: 'state_change',
  sr_uuid: SR_UUID,
  reference_id: null,
  state: { primary: 'UNDERWAY', supplement: 'ASSIGNED' },
  timestamp: TIMESTAMP,
};

export const FIXTURE_STATE_CHANGE_CANCELLED: LegitmarkWebhookEvent = {
  event_type: 'state_change',
  sr_uuid: SR_UUID,
  reference_id: null,
  state: { primary: 'CANCELLED', supplement: null },
  timestamp: TIMESTAMP,
};

export const FIXTURE_MEDIA_REJECTED: LegitmarkWebhookEvent = {
  event_type: 'media_rejected',
  sr_uuid: SR_UUID,
  reference_id: 'PARTNER-ITEM-789',
  sides: [
    { side: 'Front', reason: 'Image is Blurry', message: 'The submitted image is too blurry.' },
    { side: 'Label', reason: 'Not Visible' },
  ],
  timestamp: '2026-02-10T12:15:00.000Z',
};

export const FIXTURE_INVALIDATE_SR: LegitmarkWebhookEvent = {
  event_type: 'invalidate_sr',
  sr_uuid: SR_UUID,
  reference_id: null,
  invalidation_reason: { code: 'CANCELLED', message: 'Service request cancelled' },
  timestamp: '2026-02-10T14:30:00.000Z',
};
