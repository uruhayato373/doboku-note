import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foreignSiteWids, DOBOKU_A8_WID } from '../scripts/check-affiliate-mats.mjs';

// 2026-10-17: DX の広告に stats47（wid=001）の提携の素材を貼っていて、クリックが stats47 に帰属していた。
test('stats47 のサイト（wid=001）の A8 画像 URL を拾う', () => {
  const text = 'imageSrc: "https://www23.a8.net/svt/bgt?aid=260605733040&wid=001&eno=01&mid=s00000022413004005000&mc=1"';
  assert.deepEqual(foreignSiteWids(text), ['001']);
});

test('doboku-note のサイト（wid=002）は拾わない', () => {
  assert.equal(DOBOKU_A8_WID, '002');
  const text = '"https://www21.a8.net/svt/bgt?aid=260605733026&wid=002&eno=01&mid=s00000024757004003000&mc=1"';
  assert.deepEqual(foreignSiteWids(text), []);
});

test('画像 URL 以外の wid は対象にしない', () => {
  assert.deepEqual(foreignSiteWids('https://example.com/?wid=001'), []);
});
