import test from 'node:test';
import assert from 'node:assert/strict';
import { DELIVERY_PHASES, nextPacificReset, quotaPause, deliveryDecision, runDelivery } from '../scripts/lib/youtube-delivery.mjs';

const config = { schemaVersion: 1, enabled: true, planSha256: 'a'.repeat(64), dailyLimits: Object.fromEntries(DELIVERY_PHASES.map(p => [p, 10])), deleteOldVersions: true };
const item = { oldVideo: { id: 'private-old' }, sourceKey: 'exam/pack/longform', media: { sha256: 'b'.repeat(64) }, thumbnail: { sha256: 'c'.repeat(64) } };
const ms = Date.parse('2026-09-11T11:17:00Z');
function fixture(entries = [item]) {
  const receipts = new Map(); let state = null; const calls = [];
  const options = { config: structuredClone(config), entries, now: () => ms, commit: true,
    load: async id => receipts.get(id), loadState: async () => structuredClone(state), saveState: async x => { state = structuredClone(x); },
    act: async (phase, entry) => { calls.push(phase); receipts.set(entry.oldVideo.id, { newId: 'private-new', phase: 'uploaded-private' }); return { phase: 'uploaded-private' }; },
  };
  return { options, receipts, calls, state: () => state };
}
test('Pacific reset follows DST rather than a fixed UTC offset', () => {
  assert.equal(nextPacificReset(Date.parse('2026-09-10T03:00:00Z')), '2026-09-10T07:00:00.000Z');
  assert.equal(nextPacificReset(Date.parse('2026-12-10T03:00:00Z')), '2026-12-10T08:00:00.000Z');
});
test('persisted upload identity prevents another insert on the next run', async () => {
  const f = fixture(); await runDelivery(f.options);
  f.options.act = async phase => { assert.equal(phase, 'audit'); return { phase: 'awaiting-processing' }; };
  await runDelivery(f.options); assert.deepEqual(f.calls, ['upload']);
});
test('daily budget is reserved before calls and survives repeated dispatches', async () => {
  const f = fixture([item, { ...item, oldVideo: { id: 'second' } }]); f.options.config.dailyLimits.upload = 1;
  f.options.act = async phase => { assert.equal(f.state().used.upload, 1); f.calls.push(phase); return { phase: 'uploaded-private' }; };
  await runDelivery(f.options); await runDelivery(f.options); assert.deepEqual(f.calls, ['upload']);
});
test('quota rejection is a durable wait and does not become a failed retry loop', async () => {
  const f = fixture(); let called = 0;
  f.options.act = async () => { called++; throw Object.assign(new Error('PRIVATE VIDEO ID'), { response: { status: 429, data: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } } }); };
  const summary = await runDelivery(f.options); await runDelivery(f.options);
  assert.equal(called, 1); assert.equal(summary.cooldowns.upload, '2026-09-12T07:00:00.000Z');
  assert.ok(!JSON.stringify(summary).includes('PRIVATE')); assert.equal(summary.waiting['pending-upload'], 1);
});
test('authentication and ambiguous API failures remain failures', async () => {
  const f = fixture(); f.options.act = async () => { throw Object.assign(new Error('auth'), { response: { status: 401 } }); };
  await assert.rejects(runDelivery(f.options), /auth/);
  assert.equal(quotaPause({ response: { status: 500 } }, 'upload', ms), null);
});
test('initial cooldown skips YouTube writes and dry-run never saves state', async () => {
  const f = fixture(); f.options.config.uploadRetryNotBefore = '2099-01-01T00:00:00Z';
  await runDelivery(f.options); assert.equal(f.calls.length, 0);
  f.options.commit = false; f.options.config.uploadRetryNotBefore = null;
  f.options.saveState = () => assert.fail('dry-run persisted state'); f.options.act = () => assert.fail('dry-run mutated YouTube');
  assert.equal((await runDelivery(f.options)).actions.upload, 1);
});
test('uncertain upload/thumbnail outcomes wait for reconciliation', () => {
  assert.equal(deliveryDecision(item, { phase: 'upload-intent' }, ms).blocked, 'upload-outcome-uncertain');
  assert.equal(deliveryDecision(item, { newId: 'new', processingVerifiedAt: 'now', preservationAudit: { playlistInventoryComplete: true }, thumbnail: { phase: 'intent' } }, ms).blocked, 'thumbnail-outcome-uncertain');
});
test('playback and link proof remain required, while deletion preflight is automatic', () => {
  const receipt = { oldId: 'private-old', newId: 'new', processingVerifiedAt: 'now', preservationAudit: { playlistInventoryComplete: true }, thumbnail: { phase: 'verified', expectedSha256: item.thumbnail.sha256 } };
  assert.match(deliveryDecision(item, receipt, ms).blocked, /playback/);
  receipt.activation = {}; assert.equal(deliveryDecision(item, receipt, ms).blocked, 'dependent-links');
  receipt.linkVerification = { matched: true, newId: 'new' }; assert.equal(deliveryDecision(item, receipt, ms).phase, 'delete');
  receipt.deletionAudit = { matched: true, oldId: receipt.oldId, newId: receipt.newId, checkedAt: new Date(ms - 3601e3).toISOString() };
  assert.equal(deliveryDecision(item, receipt, ms).phase, 'delete');
});
test('future Shorts use their approved slot only after deletion; missed slots do not mass-publish', () => {
  const receipt = { newId: 'new', phase: 'deleted', relatedVerification: { matched: true, relatedVideoId: 'parent00001' } };
  assert.equal(deliveryDecision(item, receipt, ms, { publishAt: '2026-10-01T20:00:00+09:00' }).phase, 'schedule');
  assert.equal(deliveryDecision(item, receipt, ms, { publishAt: '2026-09-01T20:00:00+09:00' }).blocked, 'expired-publication-slot');
  receipt.publication = { status: 'scheduled' }; assert.equal(deliveryDecision(item, receipt, ms, {}).complete, true);
});
test('journal for another immutable plan cannot be silently reused', async () => {
  const f = fixture(); f.options.loadState = async () => ({ planSha256: 'b'.repeat(64) });
  await assert.rejects(runDelivery(f.options), /plan changed/); assert.equal(f.calls.length, 0);
});
test('deletion stays disabled if configuration does not authorize it', async () => {
  const f = fixture(); f.options.config.deleteOldVersions = false;
  f.receipts.set(item.oldVideo.id, { newId: 'new', oldId: item.oldVideo.id, activation: {}, linkVerification: { matched: true, newId: 'new' }, deletionAudit: { matched: true, oldId: item.oldVideo.id, newId: 'new', checkedAt: new Date(ms).toISOString() } });
  await runDelivery(f.options); assert.equal(f.calls.length, 0);
});
test('public summary excludes both old and new private identities', async () => {
  const f = fixture(); const result = await runDelivery(f.options);
  assert.ok(!JSON.stringify(result).includes('private-old'));
  assert.ok(!JSON.stringify(result).includes('private-new'));
});
