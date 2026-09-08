import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { thumbnailInput, updateThumbnail } from '../scripts/lib/youtube-thumbnail-update.mjs';
import { validateCoverSpec, validateCoverDesign, COVER_FORMATS } from '../scripts/lib/youtube-cover.mjs';

const channel = { id: 'UCHRnXPqoc0Hls8nXiK_ZYqA', title: 'doboku-note' };
const videoId = 'hJYV_U0qKvA';
const buffer = await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#0f2742' } }).png().toBuffer();
const input = await thumbnailInput(buffer, { videoId, channel });
function mock({ wrongChannel = false, missing = false, drift = false, uploadFailure = false } = {}) {
  let reads = 0;
  const calls = [];
  const video = { id: videoId, snippet: { channelId: channel.id, title: 'そのまま', description: 'そのまま', tags: ['土木'], thumbnails: {} },
    status: { privacyStatus: 'private', publishAt: '2026-10-01T10:00:00Z' }, contentDetails: { duration: 'PT2M51S' } };
  const youtube = {
    channels: { list: async () => ({ data: { items: [{ id: wrongChannel ? 'other' : channel.id, snippet: { title: channel.title } }] } }) },
    videos: { list: async () => { reads++; const v = structuredClone(video); if (drift && reads > 1) v.status.privacyStatus = 'public'; return { data: { items: missing ? [] : [v] } }; } },
    thumbnails: { set: async (request, options) => { calls.push({ request, options }); if (uploadFailure) throw new Error('timeout'); return { data: { items: [{}] } }; } },
  };
  return { youtube, calls };
}
test('画像と単一ID、確認済みsha、API上限を検証する', async () => {
  assert.equal(input.width, 1280);
  for (const opts of [{ videoId: '' }, { channel: {} }, { expectedSha256: 'wrong' }, { commit: true }]) {
    await assert.rejects(thumbnailInput(buffer, { videoId, channel, ...opts }));
  }
  await assert.rejects(thumbnailInput(Buffer.alloc(2 * 1024 * 1024 + 1), { videoId, channel }), /2MB/);
  const webp = await sharp(buffer).webp().toBuffer();
  await assert.rejects(thumbnailInput(webp, { videoId, channel }), /PNG/);
});
test('既定dry-runはアカウントと対象を照合するが更新しない', async () => {
  const { youtube, calls } = mock();
  const result = await updateThumbnail(youtube, input, buffer);
  assert.equal(calls.length, 0);
  assert.equal(result.before.status.privacyStatus, 'private');
  assert.equal(result.apiAccepted, false);
});
test('commitはthumbnails.setだけ1回呼び、設定を保持・実表示確認とは区別する', async () => {
  const { youtube, calls } = mock();
  const phases = [];
  const result = await updateThumbnail(youtube, input, buffer, { commit: true, record: r => phases.push(r.phase) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].request.videoId, videoId);
  assert.deepEqual(calls[0].options, { retry: false });
  assert.deepEqual(result.before.status, result.after.status);
  assert.equal(result.visualVerified, false);
  assert.equal(result.apiAccepted, true);
  assert.deepEqual(phases, ['checked', 'sending', 'accepted-awaiting-readback', 'api-accepted-visual-check-required']);
});
test('別アカウント・存在しない動画では書込み0件', async () => {
  for (const opts of [{ wrongChannel: true }, { missing: true }]) {
    const { youtube, calls } = mock(opts);
    await assert.rejects(updateThumbnail(youtube, input, buffer, { commit: true }));
    assert.equal(calls.length, 0);
  }
});
test('公開設定ドリフトを成功にせず、自動的な公開/復旧をしない', async () => {
  const { youtube, calls } = mock({ drift: true });
  let phase;
  await assert.rejects(updateThumbnail(youtube, input, buffer, { commit: true, record: r => { phase = r.phase; } }), /サムネイル以外/);
  assert.equal(calls.length, 1);
  assert.equal(phase, 'accepted-but-verification-failed');
});
test('不確定な書込結果を自動再試行しない', async () => {
  const { youtube, calls } = mock({ uploadFailure: true });
  let phase;
  await assert.rejects(updateThumbnail(youtube, input, buffer, { commit: true, record: r => { phase = r.phase; } }), /timeout/);
  assert.equal(calls.length, 1);
  assert.equal(phase, 'write-outcome-uncertain');
});
test('事前記録の失敗・検証後の画像変更なら書込しない', async () => {
  const { youtube, calls } = mock();
  await assert.rejects(updateThumbnail(youtube, input, buffer, { commit: true, record: () => { throw new Error('disk full'); } }), /disk/);
  await assert.rejects(updateThumbnail(youtube, input, Buffer.from('changed'), { commit: true }), /画像/);
  assert.equal(calls.length, 0);
});
test('見出しを編集可能な2〜3行で保持し、長文縮小を拒否する', () => {
  const spec = { format: 'longform', exam: 'civil-1', headline: ['工事概要', '７項目の埋め方'], accentLine: 1,
    subtitle: '施工経験記述', character: { pose: 'pointing', frame: 'waist' } };
  assert.deepEqual(validateCoverSpec(spec), COVER_FORMATS.longform);
  assert.throws(() => validateCoverSpec({ ...spec, headline: ['この見出しは長すぎて収まりません', '短くする'] }));
  assert.throws(() => validateCoverSpec({ ...spec, format: '__proto__' }));
  assert.throws(() => validateCoverSpec({ ...spec, exam: '__proto__' }));
  assert.throws(() => validateCoverSpec({ ...spec, accentLine: 3 }));
  const design = { schemaVersion: 1, covers: { longform: spec } };
  assert.equal(validateCoverDesign(design, { exam: 'civil-1' }), design);
  assert.throws(() => validateCoverDesign(design, { exam: 'civil-2' }), /試験が不一致/);
  assert.throws(() => validateCoverDesign({ ...design, schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => validateCoverDesign({ schemaVersion: 1, covers: {} }), /0件/);
  assert.throws(() => validateCoverDesign({ schemaVersion: 1, covers: [] }));
});
