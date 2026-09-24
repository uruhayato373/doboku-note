import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planAdmin, classifyAdminError } from '../scripts/ga4-admin-api.mjs';

const desired = {
  customDimensions: [{ parameterName: 'event_label' }, { parameterName: 'cta_placement' }],
  keyEvents: [{ eventName: 'note_cta_click' }, { eventName: 'quiz_complete' }],
  dataRetention: { eventDataRetentionMonths: 14, resetOnNewActivity: true },
};

test('planAdmin lists missing key events and dimensions, and retention drift', () => {
  const plan = planAdmin(desired, {
    customDimensions: [{ parameterName: 'EVENT_LABEL' }],
    keyEvents: [{ eventName: 'note_cta_click' }],
    retention: { eventDataRetention: 'TWO_MONTHS', resetUserDataOnNewActivity: true },
  });
  assert.deepEqual(plan.dimensions, { present: ['event_label'], missing: ['cta_placement'] });
  assert.deepEqual(plan.keyEvents, { present: ['note_cta_click'], missing: ['quiz_complete'] });
  assert.equal(plan.retention.months, 2);
  assert.match(plan.retention.drift, /2 か月（期待 14 か月）/);
});

test('planAdmin reports no drift when the property matches', () => {
  const plan = planAdmin(desired, {
    customDimensions: [{ parameterName: 'event_label' }, { parameterName: 'cta_placement' }],
    keyEvents: [{ eventName: 'note_cta_click' }, { eventName: 'quiz_complete' }],
    retention: { eventDataRetention: 'FOURTEEN_MONTHS', resetUserDataOnNewActivity: true },
  });
  assert.deepEqual([plan.dimensions.missing, plan.keyEvents.missing, plan.retention.drift], [[], [], null]);
});

test('classifyAdminError separates disabled API from missing permission', () => {
  assert.equal(classifyAdminError({ message: 'Google Analytics Admin API has not been used in project 1 before or it is disabled', code: 403 }).kind, 'api-disabled');
  assert.equal(classifyAdminError({ message: 'User does not have sufficient permissions', code: 403 }).kind, 'permission-denied');
  assert.equal(classifyAdminError({ message: 'boom', code: 500 }).kind, 'error');
});
