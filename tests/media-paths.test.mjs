import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdoptedPngPath, mediaPath, parseMediaPath, sha8Matches, mimeOf } from '../scripts/lib/media-paths.mjs';

const SHA = '2a24500dd9c74fb1886ff03eefd95a4f777bef4ab581e8399bda599a0f239ce2';

test('公開・作品共有・ブランド共通の素材のパスが往復する', () => {
  const p = mediaPath({ pubId: 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform', role: 'cover', sha256: SHA, ext: 'png' });
  assert.equal(p, '.tmp/media/civil-construction-2/matome-2kyu-chokuzen/youtube.longform/cover.2a24500d.png');
  assert.deepEqual(parseMediaPath(p), { exam: 'civil-construction-2', work: 'matome-2kyu-chokuzen', pubDir: 'youtube.longform', pubId: 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform', role: 'cover', sha8: '2a24500d', ext: 'png' });
  assert.equal(parseMediaPath(mediaPath({ exam: 'civil-construction-1', work: 'textbook-crane', role: 'plate-crane', sha256: SHA, ext: 'webp' })).pubId, null);
  assert.equal(parseMediaPath(mediaPath({ brand: 'bridge-notebook-a', role: 'youtube-shorts-cta', sha256: SHA, ext: 'png' })).brand, 'bridge-notebook-a');
  assert.ok(sha8Matches(p, SHA));
  assert.ok(!sha8Matches(p, 'b'.repeat(64)));
  assert.equal(mimeOf('mp4'), 'video/mp4');
});

test('日付フォルダ・連番名・大文字・.. は規則に合わない', () => {
  for (const bad of [
    '.tmp/video-render/youtube-covers-a-rollout-20260909/243.png',
    '.tmp/media/civil-construction-2/matome/youtube.longform/cover.png',
    '.tmp/media/civil-construction-2/Matome/youtube.longform/cover.2a24500d.png',
    '.tmp/media/civil-construction-2/../youtube.longform/cover.2a24500d.png',
    '.tmp/media/civil-construction-2/matome/youtube.longform/243.2a24500d.png',
  ]) assert.equal(parseMediaPath(bad), null, bad);
  assert.throws(() => mediaPath({ pubId: 'civil-construction-2/matome-2kyu-chokuzen/youtube.longform', role: 'cover', sha256: 'short', ext: 'png' }), /sha256/);
});

test('採用 PNG として読めるのは素材の置き場の png と、移す前の置き場だけ', () => {
  assert.ok(isAdoptedPngPath('.tmp/media/civil-construction-2/matome-2kyu-chokuzen/youtube.longform/cover.2a24500d.png'));
  assert.ok(isAdoptedPngPath('.tmp/media/_brand/bridge-notebook-a/cta-shorts.68cae2be.png'));
  assert.ok(isAdoptedPngPath('.tmp/video-render/youtube-covers-a-rollout-20260909/243.png'));
  for (const bad of [
    '.tmp/media/civil-construction-2/matome-2kyu-chokuzen/youtube.longform/video.1355361e.mp4',
    '.tmp/media/civil-construction-2/../youtube.longform/cover.2a24500d.png',
    '../../secret.png',
    '.tmp/video-render/a/b/c.png',
    null,
  ]) assert.equal(isAdoptedPngPath(bad), false, String(bad));
});
