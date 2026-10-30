/**
 * 広告リンク・計測ピクセルの素材キー（scripts/lib/affiliate-link-keys.mjs）。
 * 2026-10-30 まで検査は a8mat= だけを見ていて、もしもの素材の未登録・二重発火を検知できなかった。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { impressionKeyCounts, linkKeys } from '../scripts/lib/affiliate-link-keys.mjs';

const MOSHIMO_CLICK = 'https://af.moshimo.com/af/c/click?a_id=5868364&p_id=4183&pc_id=10609&pl_id=57940';
const MOSHIMO_IMP = 'https://i.moshimo.com/af/i/impression?a_id=5868364&p_id=4183&pc_id=10609&pl_id=57940';

test('A8 の a8mat ともしもの p_id・pl_id を同じ形のキーで拾う', () => {
  const text = `href: "https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH",\nhref: "${MOSHIMO_CLICK}",\npixel: "${MOSHIMO_IMP}"`;
  assert.deepEqual(linkKeys(text), ['4B5OO5+FHBA2+5B0Y+NTZCH', 'moshimo:4183:57940', 'moshimo:4183:57940']);
  // HTML の &amp; でも同じキー
  assert.deepEqual(linkKeys(MOSHIMO_CLICK.replace(/&/g, '&amp;')), ['moshimo:4183:57940']);
  // 単一トークンの a8mat や pl_id の無いもしもの URL は拾わない
  assert.deepEqual(linkKeys('a8mat=XXXX https://af.moshimo.com/af/c/click?a_id=1&p_id=2'), []);
});

test('描画済み HTML のピクセルを素材キーごとに数え、RSC payload の文字列は数えない', () => {
  const html = [
    `<img src="${MOSHIMO_IMP.replace(/&/g, '&amp;')}" width="1" height="1">`,
    `<span hidden data-a8-pixel="${MOSHIMO_IMP}"></span>`,
    '<img src="https://www15.a8.net/0.gif?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH" width="1" height="1">',
    `self.__next_f.push([1,"${MOSHIMO_IMP}"])`,
  ].join('\n');
  assert.deepEqual(impressionKeyCounts(html), { 'moshimo:4183:57940': 2, '4B5OO5+FHBA2+5B0Y+NTZCH': 1 });
});
