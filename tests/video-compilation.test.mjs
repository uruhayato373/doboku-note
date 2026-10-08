import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleCompilation, estimateSceneSec, CHARS_PER_SEC } from '../scripts/lib/video-compilation.mjs';

const source = (scenes, approvedBy = 'user') => ({
  storyboard: { format: 'longform-16x9', scenes },
  longform: { status: 'scheduled', approvedBy },
});
const packs = {
  a: source([
    { sceneId: 'cover', start: 0, end: 15, narration: '表紙の語り。', caption: '表紙' },
    { sceneId: 'premise', start: 15, end: 55, narration: '前提の語り。', caption: '前提', visual: { heading: '前提' } },
    { sceneId: 'cta', start: 55, end: 70, narration: '概要欄へ。', caption: 'CTA' },
  ]),
  b: source([
    { sceneId: 'cover', start: 0, end: 15, narration: '表紙。', caption: '表紙' },
    { sceneId: 'summary', start: 15, end: 30, narration: 'まとめの語り。', caption: 'まとめ' },
    { sceneId: 'cta', start: 30, end: 40, narration: 'リンクへ。', caption: 'CTA' },
  ]),
};
const spec = {
  schemaVersion: 1,
  opening: { narration: '総まとめです。', caption: '総まとめ', visual: { kind: 'cover', heading: '総まとめ' } },
  parts: [
    { label: '第一次', chapters: [{ packId: 'a', title: '土工' }] },
    { label: '第二次', intro: 'ここから後半です。', chapters: [{ packId: 'b', title: '記述' }] },
  ],
  closing: { narration: '以上です。', caption: '以上', visual: { kind: 'cover', heading: '以上' } },
};

test('元パックの表紙と締めを外し、章の区切りと場面の出どころを付けて連続した尺で並べる', () => {
  const { storyboard, chapters } = assembleCompilation(spec, (id) => packs[id]);
  assert.deepEqual(storyboard.scenes.map((s) => s.sceneId), ['cover', 'c01-title', 'c01-premise', 'c02-title', 'c02-summary', 'cta']);
  assert.deepEqual(storyboard.scenes[2].from, { packId: 'a', sceneId: 'premise' });
  assert.equal(storyboard.scenes[3].narration, 'ここから後半です。第2章は、記述です。');
  assert.equal(storyboard.scenes[1].visual.items[0], '第一次');
  let end = 0;
  for (const s of storyboard.scenes) {
    assert.equal(s.start, end, s.sceneId);
    assert.ok(s.end > s.start, s.sceneId);
    end = s.end;
  }
  assert.deepEqual(chapters.map((c) => [c.n, c.packId, c.startSec]), [[1, 'a', storyboard.scenes[1].start], [2, 'b', storyboard.scenes[3].start]]);
});

test('ユーザー承認の無いパック・同じパックの重複は束ねない', () => {
  assert.throws(() => assembleCompilation(spec, (id) => (id === 'b' ? source(packs.b.storyboard.scenes, null) : packs[id])), /ユーザー承認/);
  const dup = { ...spec, parts: [{ label: 'x', chapters: [{ packId: 'a', title: '1' }, { packId: 'a', title: '2' }] }] };
  assert.throws(() => assembleCompilation(dup, (id) => packs[id]), /2回/);
});

test('設計尺は字数÷実測の読み上げ速度（最短2秒・0.1秒単位の切り上げ）', () => {
  assert.equal(estimateSceneSec('あ'.repeat(60)), Math.ceil((60 / CHARS_PER_SEC) * 10) / 10);
  assert.equal(estimateSceneSec('短い'), 2);
});
