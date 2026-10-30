/**
 * 2 枚並べ（config/affiliate-placements.json の pairs・EXP-048）の解決。
 * 面のルールの案件が 1 枚目のとき、その面にだけ 2 枚目が付き、組の無い資格・面には付かない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';
import { findPairOverlaps, resolvePair } from '../src/lib/affiliate-placement-core.mjs';

const load = () => loadTsModule('src/lib/affiliate-placement.ts');
const AFTER = Date.parse('2026-11-02T12:00:00+09:00');
const BEFORE = Date.parse('2026-10-30T12:00:00+09:00');

const second = (r, slot) => r[slot]?.secondary?.program ?? null;

test('本文中間・本文中に 2 枚目が付き、カテゴリごとの組が設計どおり', async () => {
  const { resolvePlacements } = await load();
  const doc = (category, isCareerDoc = false) => resolvePlacements({ pageKind: 'doc', category, isCareerDoc }, AFTER);
  assert.equal(second(doc('civil-construction-1'), 'article-mid'), 'constwork');
  assert.equal(second(doc('civil-construction-1'), 'article-inline'), 'constwork');
  assert.equal(second(doc('building-construction'), 'article-mid'), 'buildjob');
  assert.equal(second(doc('civil-construction-2'), 'article-mid'), 'buildjob', '2 級の学習記事は建設JOBs＋ビルドジョブ');
  assert.equal(second(doc('civil-construction-2', true), 'article-mid'), 'constwork', '2 級のキャリア記事はビルドジョブ＋コンストワーク');
  // ハイクラス（総監・RCCM）は 2 枚目の承認待ちなので 1 枚
  assert.equal(second(doc('pe-comprehensive-management'), 'article-mid'), null);
  assert.equal(second(doc('rccm'), 'article-mid'), null);
  // 開始前は付かない
  assert.equal(second(resolvePlacements({ pageKind: 'doc', category: 'civil-construction-1', isCareerDoc: false }, BEFORE), 'article-mid'), null);
});

test('カテゴリの面（サイドバー）には 2 枚目を付けない', async () => {
  const { resolvePlacements } = await load();
  const cat = resolvePlacements({ pageKind: 'category', category: 'civil-construction-1' }, AFTER);
  for (const slot of Object.keys(cat)) assert.equal(second(cat, slot), null, slot);
});

test('同じ 1 枚目・面で 2 つの組が当たれば投げ、重なりを検出する', () => {
  const base = { primary: 'buildjob', secondary: 'constwork', slots: ['article-mid'], target: { pageKind: 'doc', categories: ['laws'] }, period: { from: '2026-10-31T00:00:00+09:00', until: null } };
  const pairs = [{ ...base, id: 'PP-9001' }, { ...base, id: 'PP-9002', secondary: 'kensetsu-jobs' }];
  const rule = { id: 'PL-9', program: 'buildjob', slot: 'article-mid', target: { pageKind: 'doc' }, period: { from: '2026-10-01T00:00:00+09:00', until: null } };
  assert.throws(() => resolvePair(pairs, rule, { pageKind: 'doc', category: 'laws' }, AFTER), /PP-9001 と PP-9002/);
  assert.deepEqual(findPairOverlaps(pairs), [['PP-9001', 'PP-9002']]);
  assert.equal(resolvePair(pairs, { ...rule, program: 'dx-consulting' }, { pageKind: 'doc', category: 'laws' }, AFTER), null, '1 枚目が違えば付かない');
});
