// ページ単位の商品導線ゼロの判定（scripts/lib/magazine-page-gate.mjs）を固定する（DN-0890）。
//   - もくじタイルが出る資格（建設部門など）でも、商品の導線が無いページはゼロと数える
//   - 記事のあるカテゴリが検査対象にも対象外にも無ければ uncovered に出す（新しい資格が黙って漏れない）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageGate } from '../scripts/lib/magazine-page-gate.mjs';

const gate = new Set(['pe-construction', 'civil-construction-2']);
const excluded = { 'civil-practice': '実務記事' };
const docs = [
  // もくじタイルだけで商品の導線が無いページ（2級の見直しページの形）
  { slug: 'civil-construction-2-guide-r08-secondary-answers', category: 'civil-construction-2', isCareer: false },
  { slug: 'pe-construction-r07-road', category: 'pe-construction', isCareer: false },
  { slug: 'pe-construction-career-change', category: 'pe-construction', isCareer: true },
  { slug: 'civil-practice-trench', category: 'civil-practice', isCareer: false },
];
const withSurface = new Set(['pe-construction-r07-road']);

test('もくじタイルの出る資格でも、商品の導線が無いページはゼロと数える', () => {
  const r = pageGate(docs, { gate, excluded, hasSurface: (s) => withSurface.has(s) });
  assert.deepEqual(r.zeroPages.map((d) => d.slug), ['civil-construction-2-guide-r08-secondary-answers']);
  assert.equal(r.gateDocs.length, 3);
  assert.equal(r.targets.length, 2, 'career 記事は対象外');
  assert.deepEqual(r.uncovered, []);
});

test('検査対象にも対象外にも無いカテゴリは uncovered に出す', () => {
  const r = pageGate([...docs, { slug: 'new-qual-guide-overview', category: 'new-qual', isCareer: false }],
    { gate, excluded, hasSurface: () => true });
  assert.deepEqual(r.uncovered, ['new-qual']);
  assert.ok(!r.gateDocs.some((d) => d.category === 'new-qual'));
});
