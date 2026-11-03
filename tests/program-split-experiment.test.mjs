// tests/program-split-experiment.test.mjs
//
// EXP-055（配置ルールの出し分け・技術士（建設部門）でビルドジョブ／ハイクラス DX・コンサル転職・DN-0952）を固定する。
// 守りたい事故: 両方の案件が見える／JS が無いと広告が消える／出し分けが別の面・別のカテゴリに漏れる／2 組が同じ面に当たる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

import { PROGRAM_SPLIT_KEY, PROGRAM_SPLIT_SCRIPT, assignProgramSplitArm } from '../src/lib/program-split-experiment.mjs';
import { findSplitOverlaps, resolveSplit } from '../src/lib/affiliate-placement-core.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const memory = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

test('保存済みの側を使い、無ければ半々で決めて保存する', () => {
  assert.equal(assignProgramSplitArm(memory({ [PROGRAM_SPLIT_KEY]: 'alternate' })), 'alternate');
  const s = memory();
  assert.equal(assignProgramSplitArm(s, () => 0.1), 'primary');
  assert.equal(s.m.get(PROGRAM_SPLIT_KEY), 'primary');
  assert.equal(assignProgramSplitArm(memory(), () => 0.9), 'alternate');
});

test('<head> のスクリプトは同じ鍵で側を決めて <html> に書く', () => {
  for (const [stored, random, want] of [['alternate', 0.1, 'alternate'], [null, 0.1, 'primary'], [null, 0.9, 'alternate']]) {
    const attrs = {};
    vm.runInNewContext(PROGRAM_SPLIT_SCRIPT, {
      localStorage: memory(stored ? { [PROGRAM_SPLIT_KEY]: stored } : {}),
      Math: { random: () => random },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } } },
    });
    assert.equal(attrs['data-program-split'], want);
  }
});

const split = { id: 'PS-0001', primary: 'buildjob', alternate: 'dx-consulting', slots: ['category-sidebar', 'category-mobile'], target: { pageKind: 'category', categories: ['pe-construction'] }, period: { from: '2026-11-03T00:00:00+09:00', until: null }, experiment: 'EXP-055' };
const now = Date.parse('2026-11-10T00:00:00+09:00');

test('出し分けは対象の面・カテゴリ・案件だけに当たる', () => {
  const rule = { program: 'buildjob', slot: 'category-sidebar' };
  assert.equal(resolveSplit([split], rule, { pageKind: 'category', category: 'pe-construction' }, now)?.id, 'PS-0001');
  assert.equal(resolveSplit([split], rule, { pageKind: 'category', category: 'civil-construction-1' }, now), null);
  assert.equal(resolveSplit([split], { program: 'buildjob', slot: 'article-mid' }, { pageKind: 'doc', category: 'pe-construction' }, now), null);
  assert.equal(resolveSplit([split], { program: 'kensetsu-jobs', slot: 'category-sidebar' }, { pageKind: 'category', category: 'pe-construction' }, now), null);
  assert.equal(resolveSplit([split], rule, { pageKind: 'category', category: 'pe-construction' }, Date.parse('2026-11-01T00:00:00+09:00')), null);
  assert.deepEqual(findSplitOverlaps([split, { ...split, id: 'PS-0009' }]), [['PS-0001', 'PS-0009']]);
});

test('配線: 設定に PS-0001 があり、CSS が片方を隠し、<head> と資格トップの部品がつながっている', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'config/affiliate-placements.json'), 'utf8'));
  const ps = cfg.splits.find((s) => s.id === 'PS-0001');
  assert.equal(ps.experiment, 'EXP-055');
  assert.equal(ps.alternate, 'dx-consulting');
  const css = readFileSync(join(ROOT, 'src/styles/globals.css'), 'utf8');
  assert.match(css, /html:not\(\[data-program-split="alternate"\]\) \[data-program-split-arm="alternate"\],\s*html\[data-program-split="alternate"\] \[data-program-split-arm="primary"\]\s*\{\s*display: none;/);
  assert.match(readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8'), /PROGRAM_SPLIT_SCRIPT/);
  const page = readFileSync(join(ROOT, 'src/components/category/CategoryPage.tsx'), 'utf8');
  assert.equal((page.match(/<ProgramSplitBanner/g) ?? []).length, 2);
  const banner = readFileSync(join(ROOT, 'src/components/ui/SidebarAdBanner/ProgramSplitBanner.tsx'), 'utf8');
  assert.doesNotMatch(banner.slice(banner.indexOf('data-program-split-arm="alternate"')), /pixelSrc=/, '代わりの案件にピクセルを付けない（1 ページ 1 ピクセル）');
});
