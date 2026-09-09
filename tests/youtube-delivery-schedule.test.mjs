import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleReplacement } from '../scripts/lib/youtube-delivery-schedule.mjs';

function fixture() {
  const item = { oldVideo: { id: 'oldVideo001', snippet: { channelId: 'channel' } }, sourceKey: 'exam/pack/short', media: { sha256: 'media', bytes: 1000, duration: 30, width: 1080, height: 1920 }, thumbnail: { sha256: 'cover' } };
  let receipt = { phase: 'deleted', oldId: item.oldVideo.id, newId: 'newVideo001', mediaSha256: 'media', thumbnail: { phase: 'verified', expectedSha256: 'cover' }, playbackVerification: { channelMatched: true, coverLogoMatched: true, ctaMatched: true }, preservationAudit: { playlistInventoryComplete: true, memberships: [], oldCaptions: [] }, relatedVerification: { matched: true, relatedVideoId: 'parent00001' } };
  let video = { id: receipt.newId, snippet: { channelId: 'channel' }, status: { privacyStatus: 'private', uploadStatus: 'processed', license: 'youtube' }, processingDetails: { processingStatus: 'succeeded' }, contentDetails: { duration: 'PT30S' }, fileDetails: { fileSize: 1000, durationMs: 30000, videoStreams: [{ widthPixels: 1080, heightPixels: 1920 }], audioStreams: [{}] } };
  let parent = { id: 'parent00001', snippet: { channelId: 'channel' }, status: { privacyStatus: 'public' } }, calls = 0;
  const youtube = { videos: {
    list: async ({ id }) => ({ data: { items: [structuredClone(id === parent.id ? parent : video)] } }),
    update: async ({ requestBody }) => { calls++; assert.equal(receipt.publicationIntent.publishAt, requestBody.status.publishAt); assert.equal(requestBody.id, receipt.newId); video.status = { ...video.status, ...requestBody.status }; return { data: {} }; },
  } };
  const options = { publication: { publishAt: '2099-01-01T20:00:00+09:00' }, parentNewId: parent.id, load: async () => structuredClone(receipt), save: async (_, value) => { receipt = structuredClone(value); } };
  return { item, youtube, options, receipt: () => receipt, calls: () => calls, edit: fn => fn(receipt, video, parent) };
}
test('verified Shorts are reserved at their exact future slot; retry does not send another update', async () => {
  const f = fixture(); await scheduleReplacement(f.youtube, f.item, f.options); await scheduleReplacement(f.youtube, f.item, f.options);
  assert.equal(f.calls(), 1); assert.equal(f.receipt().publication.publishAt, f.options.publication.publishAt);
});
test('Shorts cannot publish before replacement deletion or without matching related target proof', async () => {
  for (const mutate of [r => { r.phase = 'activated'; }, r => { r.relatedVerification.matched = false; }, r => { r.relatedVerification.relatedVideoId = 'other000001'; }, (_, v, p) => { p.status.privacyStatus = 'private'; }]) {
    const f = fixture(); f.edit(mutate); await assert.rejects(scheduleReplacement(f.youtube, f.item, f.options)); assert.equal(f.calls(), 0);
  }
});
test('missed slots and unexpected existing schedules are not overwritten', async () => {
  const f = fixture(); f.options.publication.publishAt = '2020-01-01T00:00:00Z'; await assert.rejects(scheduleReplacement(f.youtube, f.item, f.options), /expired/); assert.equal(f.calls(), 0);
  const g = fixture(); g.edit((_, v) => { v.status.publishAt = '2098-01-01T00:00:00Z'; }); await assert.rejects(scheduleReplacement(g.youtube, g.item, g.options), /differs/); assert.equal(g.calls(), 0);
});
test('lost reservation response is reconciled from actual schedule before retry', async () => {
  const f = fixture(), update = f.youtube.videos.update;
  f.youtube.videos.update = async args => { await update(args); throw new Error('lost response'); };
  await assert.rejects(scheduleReplacement(f.youtube, f.item, f.options), /lost/);
  await scheduleReplacement(f.youtube, f.item, f.options); assert.equal(f.calls(), 1); assert.equal(f.receipt().publication.status, 'scheduled');
});
