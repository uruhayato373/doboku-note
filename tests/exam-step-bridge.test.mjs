import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// 技術士第一次試験の過去問ページ → 二次試験の入口カード（exam-step-bridge.ts）。
const { resolveExamStepBridge } = await loadTsModule('src/lib/exam-step-bridge.ts');

test('専門科目の部門ごとに二次の入口へ送る', () => {
  const c = resolveExamStepBridge('pe-first-stage', 'primary', 'pe-first-stage-r07-construction');
  assert.equal(c.links[0].href, '/exam/pe-construction');
  const w = resolveExamStepBridge('pe-first-stage', 'primary', 'pe-first-stage-r01-retry-water-supply');
  assert.ok(w.links.every((l) => l.href.includes('pe-water-supply')));
  const f = resolveExamStepBridge('pe-first-stage', 'primary', 'pe-first-stage-h23-fisheries');
  assert.ok(f.links.every((l) => l.href.includes('pe-fisheries')));
});

test('基礎・適性科目は 3 部門の入口を並べる', () => {
  const b = resolveExamStepBridge('pe-first-stage', 'primary', 'pe-first-stage-r07-basic');
  assert.deepEqual(b.links.map((l) => l.href.split('/')[2]), ['pe-construction', 'pe-water-supply', 'pe-fisheries']);
});

test('ガイド・他資格には出さない', () => {
  assert.equal(resolveExamStepBridge('pe-first-stage', 'guide', 'pe-first-stage-guide-overview'), null);
  assert.equal(resolveExamStepBridge('pe-construction', 'primary', 'pe-first-stage-r07-construction'), null);
});

test('一次の過去問ページはすべて科目が読め、リンク先は /docs/ の仮パスにならない', () => {
  const dir = join(ROOT, 'content/site/pe-first-stage');
  const slugs = readdirSync(dir).filter((d) => /^(h|r)\d{2}-/.test(d) && existsSync(join(dir, d, 'article.mdx')));
  assert.ok(slugs.length >= 80, `検査対象 ${slugs.length} 件`);
  for (const d of slugs) {
    const card = resolveExamStepBridge('pe-first-stage', 'primary', `pe-first-stage-${d}`);
    assert.ok(card, `科目が読めない: ${d}`);
    for (const l of card.links) assert.ok(!l.href.startsWith('/docs/'), `${d}: ${l.href}`);
  }
});
