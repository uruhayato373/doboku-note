import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { uploadReplacement, assertOldUnchanged, assertProcessed, MIGRATION } from '../scripts/lib/youtube-migration.mjs';
const old = { id: 'oldVideo001', snippet: { channelId: 'channel', title: '題名', description: '概要', categoryId: '27', tags: ['試験'] },
  status: { privacyStatus: 'private', publishAt: '2099-01-01T00:00:00Z', selfDeclaredMadeForKids: false }, contentDetails: { duration: 'PT40S' } };
const item = { sourceKey: 'exam/pack/longform', oldVideo: old, media: { sha256: 'a'.repeat(64), duration: 40.2, width: 1920, height: 1080 } };
const processed = { id: 'newVideo001', snippet: { ...old.snippet }, status: { privacyStatus: 'private', uploadStatus: 'processed' }, contentDetails: { duration: 'PT41S' }, processingDetails: { processingStatus: 'succeeded' }, fileDetails: { videoStreams: [{ widthPixels: 1920, heightPixels: 1080 }], audioStreams: [{}] } };
function fixture(insertError) {
  let receipt, inserted = 0; const events = [];
  const youtube = { videos: {
    list: async ({ id }) => ({ data: { items: [id === old.id ? structuredClone(old) : structuredClone(processed)] } }),
    insert: async request => { events.push('insert'); inserted++; assert.equal(receipt.phase, 'upload-intent'); assert.equal(request.notifySubscribers, false); assert.equal(request.requestBody.status.privacyStatus, 'private'); assert.equal(request.requestBody.status.publishAt, undefined); assert.equal(request.requestBody.snippet.title, old.snippet.title); if (insertError) throw insertError; return { data: { id: processed.id } }; },
    delete: () => assert.fail('Must not delete old video'), update: () => assert.fail('Must not activate video'),
  } };
  const options = { commit: true, load: async () => receipt, save: async (_, r) => { receipt = structuredClone(r); events.push(r.phase); }, getMedia: async () => Readable.from('video') };
  return { youtube, options, events, receipt: () => receipt, inserted: () => inserted };
}
test('uploads privately, journals before insertion, verifies processing, and resumes without duplicate', async () => {
  const f = fixture(); const r = await uploadReplacement(f.youtube, item, f.options);
  assert.equal(r.phase, 'processed-private'); assert.equal(f.receipt().migration, MIGRATION);
  assert.deepEqual(f.events.slice(0, 2), ['upload-intent', 'insert']);
  await uploadReplacement(f.youtube, item, f.options); assert.equal(f.inserted(), 1);
});
test('dry run performs no upload or journal mutation', async () => {
  const f = fixture(); await uploadReplacement(f.youtube, item, { ...f.options, commit: false });
  assert.equal(f.inserted(), 0); assert.equal(f.receipt(), undefined);
});
test('lost upload response stays uncertain and refuses duplicate retry', async () => {
  const f = fixture(new Error('connection lost'));
  await assert.rejects(uploadReplacement(f.youtube, item, f.options));
  assert.equal(f.receipt().phase, 'upload-intent');
  await assert.rejects(uploadReplacement(f.youtube, item, f.options), /uncertain/); assert.equal(f.inserted(), 1);
});
test('definite quota rejection is recorded separately', async () => {
  const e = new Error('quota'); e.response = { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } };
  const f = fixture(e); await assert.rejects(uploadReplacement(f.youtube, item, f.options));
  assert.equal(f.receipt().phase, 'upload-rejected');
});
test('edited title or changed schedule blocks the replacement', () => {
  const edited = structuredClone(old); edited.snippet.title = '別の動画'; assert.throws(() => assertOldUnchanged(edited, old), /drift/);
  const rescheduled = structuredClone(old); rescheduled.status.publishAt = '2099-02-01T00:00:00Z'; assert.throws(() => assertOldUnchanged(rescheduled, old), /drift/);
});
test('scheduled publication transition is allowed, but manual privacy changes are not', () => {
  const frozen = structuredClone(old); frozen.status.publishAt = '2020-01-01T00:00:00Z';
  const live = structuredClone(frozen); live.status = { ...live.status, privacyStatus: 'public' }; delete live.status.publishAt;
  assert.doesNotThrow(() => assertOldUnchanged(live, frozen)); live.status.privacyStatus = 'unlisted'; assert.throws(() => assertOldUnchanged(live, frozen));
});
test('processing checks reject truncation, wrong account, and missing audio', () => {
  assert.equal(assertProcessed(processed, item), true);
  const v = structuredClone(processed); v.contentDetails.duration = 'PT20S'; assert.throws(() => assertProcessed(v, item), /duration/);
  v.contentDetails.duration = 'PT41S'; v.fileDetails.audioStreams = []; assert.throws(() => assertProcessed(v, item), /stream/);
  v.snippet.channelId = 'other'; assert.throws(() => assertProcessed(v, item), /Wrong/);
});
test('receipt from another render cannot be reused', async () => {
  const f = fixture(); await uploadReplacement(f.youtube, item, f.options);
  await assert.rejects(uploadReplacement(f.youtube, { ...item, media: { ...item.media, sha256: 'b'.repeat(64) } }, f.options), /conflict/);
});
