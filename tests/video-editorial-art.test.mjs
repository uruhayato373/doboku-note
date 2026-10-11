import { URL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildEditorialArtwork } from '../scripts/lib/video-editorial-art.mjs';

test('章扉の番号・題名欠落は undefined を画像に焼き込まず拒否する', () => {
  assert.throws(() => buildEditorialArtwork({ visual: { art: { type: 'chapter' }, items: [] } }), /number.*title/);
});
test('詰め込み過ぎと対応関係の欠落を黙って描画しない', () => {
  assert.throws(() => buildEditorialArtwork({ visual: { heading: '長'.repeat(300), art: { type: 'focus' }, items: [] } }), /収まらない/);
  assert.throws(() => buildEditorialArtwork({ visual: { art: { type: 'mapping' }, items: ['対応先がない'] } }), /→/);
});
test('対象動画の130枚は指定構図で生成でき、4項目の概要も全件表示する', () => {
  const { scenes } = JSON.parse(readFileSync(new URL('../content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen/storyboard.json', import.meta.url)));
  const rendered = scenes.filter(s => s.visual?.art).map(s => [s, buildEditorialArtwork(s)]);
  assert.equal(scenes.length, 131);
  assert.equal(rendered.length, 130);
  for (const [s, svg] of rendered) assert.doesNotMatch(svg, /undefined|NaN/, s.sceneId);
  const overview = rendered.find(([s]) => s.sceneId === 'c01-overview');
  assert.equal(overview[0].visual.items.length, 4);
  for (const n of ['01', '02', '03', '04']) assert.ok(overview[1].includes(`>${n}</text>`));
});

test('口頭対策の図は必要な4項目を欠く入力を拒否する', () => {
  for (const diagram of ['decision', 'learning-loop', 'influence']) {
    assert.throws(() => buildEditorialArtwork({ visual: { art: { type: 'diagram', diagram, source: 'site.svg' }, items: ['一', '二', '三'] } }), /4項目/);
  }
});
test('口頭対策23枚は資格テーマで描画でき、別資格の名称が混ざらない', () => {
  let count = 0;
  for (const [exam, pack] of [['pe-comprehensive-management', 'sokan-kojutsu-kangaekata'], ['pe-construction', 'pe-kojutsu-keireki']]) {
    const { scenes } = JSON.parse(readFileSync(new URL(`../content/sns/video-packs/${exam}/${pack}/storyboard.json`, import.meta.url)));
    for (const scene of scenes.filter(s => s.visual?.art)) {
      const svg = buildEditorialArtwork(scene, { theme: { deep: '#123456', base: '#654321', label: '技術士' } });
      assert.doesNotMatch(svg, /undefined|NaN|2級土木/, scene.sceneId);
      assert.match(svg, /#123456/);
      count++;
    }
  }
  assert.equal(count, 23);
});
