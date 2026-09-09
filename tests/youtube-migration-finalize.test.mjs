import test from 'node:test';
import assert from 'node:assert/strict';
import { MIGRATION } from '../scripts/lib/youtube-migration.mjs';
import { activateReplacement, deleteOldReplacement, updateReplacementThumbnail, auditReplacement, desiredStatus } from '../scripts/lib/youtube-migration-finalize.mjs';
const old = { id: 'oldVideo001', snippet: { title: '題名', description: '概要', categoryId: '27', tags: ['試験'], channelId: 'channel' }, status: { privacyStatus: 'private', publishAt: '2099-01-01T00:00:00Z', embeddable: true }, contentDetails: { caption: 'false' } };
const item = { oldVideo: old, sourceKey: 'exam/pack/longform', media: { sha256: 'a'.repeat(64), duration: 40, width: 1920, height: 1080, bytes: 1000 }, thumbnail: { sha256: 'b'.repeat(64) } };
function fixture() {
  let oldExists = true, mutations = 0;
  let video = { id: 'newVideo001', snippet: { ...old.snippet, tags: ['試験', 'temporary-marker'] }, status: { privacyStatus: 'private', embeddable: true, uploadStatus: 'processed' }, contentDetails: { duration: 'PT40S' }, processingDetails: { processingStatus: 'succeeded' }, fileDetails: { durationMs: '40000', fileSize: '1000', videoStreams: [{ widthPixels: 1920, heightPixels: 1080 }], audioStreams: [{}] } };
  let receipt = { migration: MIGRATION, oldId: old.id, newId: video.id, mediaSha256: item.media.sha256, phase: 'processed-private', thumbnail: { phase: 'verified', expectedSha256: item.thumbnail.sha256 }, playbackVerification: { channelMatched: true, coverLogoMatched: true, ctaMatched: true }, preservationAudit: { playlistInventoryComplete: true, oldCaptions: [], memberships: [] }, linkVerification: { matched: true, newId: video.id } };
  const youtube = { videos: {
    list: async ({ id }) => ({ data: { items: id === old.id ? (oldExists ? [structuredClone(old)] : []) : [structuredClone(video)] } }),
    update: async ({ requestBody: b }) => { mutations++; assert.equal(b.id, video.id); video = { ...video, snippet: { ...b.snippet, channelId: 'channel' }, status: { ...b.status, uploadStatus: 'processed' } }; return { data: video }; },
    delete: async ({ id }) => { mutations++; assert.equal(id, old.id); assert.equal(receipt.phase, 'delete-intent'); oldExists = false; },
  }, captions: { list: () => assert.fail('No caption API call for caption=false') }, thumbnails: { set: () => assert.fail('Unexpected thumbnail write') } };
  const options = { commit: true, load: async () => structuredClone(receipt), save: async (_, r) => { receipt = structuredClone(r); } };
  return { youtube, options, receipt: () => receipt, mutateReceipt: f => f(receipt), mutations: () => mutations, removeOld: () => { oldExists = false; } };
}
test('activation removes staging marker, preserves schedule, never deletes', async () => {
  const f = fixture(); assert.equal((await activateReplacement(f.youtube, item, f.options)).phase, 'activated');
  assert.deepEqual(f.receipt().activation.snippet.tags, ['試験']); assert.equal(f.receipt().activation.status.publishAt, old.status.publishAt); assert.equal(f.mutations(), 1);
  await activateReplacement(f.youtube, item, f.options); assert.equal(f.mutations(), 1);
});
test('missing display, playback, or playlist proof blocks activation without mutations', async () => {
  for (const key of ['thumbnail', 'playbackVerification', 'preservationAudit']) {
    const f = fixture(); f.mutateReceipt(r => { delete r[key]; });
    await assert.rejects(activateReplacement(f.youtube, item, f.options)); assert.equal(f.mutations(), 0);
  }
  const f = fixture(); f.mutateReceipt(r => { r.preservationAudit.memberships = [{}]; });
  await assert.rejects(activateReplacement(f.youtube, item, f.options), /Playlist/);
});
test('Shorts cannot activate without related-video state verification', async () => {
  const f = fixture(); await assert.rejects(activateReplacement(f.youtube, { ...item, sourceKey: 'exam/pack/short' }, f.options), /related-video/);
});
test('incoming links can be repaired after activation but must block old-video deletion', async () => {
  const f = fixture(); f.mutateReceipt(r => { delete r.linkVerification; });
  await activateReplacement(f.youtube, item, f.options);
  f.mutateReceipt(r => { r.deletionAudit = { matched: true, oldId: r.oldId, newId: r.newId, checkedAt: new Date().toISOString() }; });
  await assert.rejects(deleteOldReplacement(f.youtube, item, f.options), /Dependent links/);
  assert.equal(f.mutations(), 1);
  f.mutateReceipt(r => { r.linkVerification = { matched: true, newId: r.newId }; });
  assert.equal((await deleteOldReplacement(f.youtube, item, f.options)).phase, 'deleted');
});
test('audit checks processing and records explicitly empty captions and playlist memberships', async () => {
  const f = fixture(); const result = await auditReplacement(f.youtube, item, { ...f.options, playlists: { complete: true, playlists: [] } });
  assert.deepEqual(result, { phase: 'audited', captions: 0, memberships: 0 }); assert.equal(f.mutations(), 0);
});
test('deletion requires activation and fresh dependency proof, then confirms absence', async () => {
  const f = fixture(); await assert.rejects(deleteOldReplacement(f.youtube, item, f.options), /activated/);
  await activateReplacement(f.youtube, item, f.options);
  await assert.rejects(deleteOldReplacement(f.youtube, item, f.options), /audit/);
  f.mutateReceipt(r => { r.deletionAudit = { matched: true, oldId: r.oldId, newId: r.newId, checkedAt: new Date().toISOString() }; });
  assert.equal((await deleteOldReplacement(f.youtube, item, f.options)).phase, 'deleted'); assert.equal(f.mutations(), 2);
  await deleteOldReplacement(f.youtube, item, f.options); assert.equal(f.mutations(), 2);
});
test('lost delete response resumes from persisted intent without deleting twice', async () => {
  const f = fixture(); await activateReplacement(f.youtube, item, f.options);
  f.mutateReceipt(r => { r.phase = 'delete-intent'; r.deletionAudit = { matched: true, oldId: r.oldId, newId: r.newId, checkedAt: new Date().toISOString() }; }); f.removeOld();
  assert.equal((await deleteOldReplacement(f.youtube, item, f.options)).phase, 'deleted'); assert.equal(f.mutations(), 1);
});
test('scheduled dates that have passed become public, future dates remain unchanged', () => {
  assert.equal(desiredStatus(old).publishAt, old.status.publishAt);
  assert.equal(desiredStatus({ ...old, status: { ...old.status, publishAt: '2020-01-01T00:00:00Z' } }).privacyStatus, 'public');
});
test('thumbnail cooldown returns before downloading or writing', async () => {
  const f = fixture(); const result = await updateReplacementThumbnail(f.youtube, item, { ...f.options, loadControl: async () => ({ thumbnailRetryNotBefore: '2099-01-01T00:00:00Z' }), getBytes: () => assert.fail('Must wait') });
  assert.equal(result.phase, 'thumbnail-rate-limit-wait'); assert.equal(f.mutations(), 0);
});
test('explicit thumbnail limit is retryable after cooldown, lost response stays uncertain', async t => {
  t.mock.method(Date, 'now', () => Date.parse('2090-01-01T00:00:00Z'));
  for (const explicit of [true, false]) {
    const f = fixture(); f.mutateReceipt(r => { delete r.thumbnail; }); let control = {}, calls = 0;
    f.youtube.thumbnails.set = async () => { calls++; const e = new Error('stopped'); if (explicit) e.response = { status: 429, data: { error: { errors: [{ reason: 'uploadRateLimitExceeded' }] } } }; throw e; };
    const options = { ...f.options, loadControl: async () => control, saveControl: async x => { control = x; }, getBytes: async () => Buffer.from('cover'), fetchImage: async () => ({ data: Buffer.from('old') }), compare: async () => ({ matched: false }) };
    await assert.rejects(updateReplacementThumbnail(f.youtube, item, options));
    assert.equal(f.receipt().thumbnail.phase, explicit ? 'rejected' : 'intent');
    const result = await updateReplacementThumbnail(f.youtube, item, options);
    assert.equal(result.phase, explicit ? 'thumbnail-rate-limit-wait' : 'thumbnail-outcome-uncertain'); assert.equal(calls, 1);
    if (explicit) { control = {}; await assert.rejects(updateReplacementThumbnail(f.youtube, item, options)); assert.equal(calls, 2); }
  }
});
