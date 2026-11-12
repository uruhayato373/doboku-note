import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';

// 1級土木の教科書（第1次検定の学習中の読者）には一次の教材だけを出す（2026-11-12・SEO 計画 §3）。
const { resolvePlacement } = await loadTsModule('src/lib/magazine-placement.ts');
const { resolveHubCta } = await loadTsModule('src/lib/hub-cta.ts');

test('教科書の商品カードは精読ガイド → 一次の出る順ノート、記事末も一次', () => {
  const p = resolvePlacement('civil-construction-1-textbook-scraper', 'textbook');
  assert.deepEqual(p.inline.map((s) => s.magazineId), ['civil-1-reading-guide', 'civil-1-ichiji-ronten']);
  assert.equal(p.end?.magazineId, 'civil-1-ichiji-ronten');
  assert.ok(!JSON.stringify(p).includes('experience-essay'), '二次の経験記述は出さない');
});

test('一次のページのもくじタイルは一次の見出しで、もくじへ送る（二次の直前切替をしない）', () => {
  const first = resolveHubCta('civil-construction-1', { utmSuffix: 'footer', stage: 'first' });
  assert.equal(first.mode, 'mokuji');
  assert.equal(first.title1, '第1次検定');
  assert.match(first.trackLabel, /-hub-mokuji-footer$/);
});

test('stage を渡さない面（二次・ハブ）は従来の見出し', () => {
  const t = resolveHubCta('civil-construction-1', { utmSuffix: 'footer' });
  assert.notEqual(t.title1, '第1次検定');
  // mokujiFirstStage の無い資格は stage を渡しても従来どおり
  const pe = resolveHubCta('pe-construction', { utmSuffix: 'footer', stage: 'first' });
  assert.notEqual(pe?.title1, '第1次検定');
});
