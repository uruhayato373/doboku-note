/**
 * 2 枚並べ（config/affiliate-placements.json の pairs）の判定（affiliate-placement-core.mjs）。
 * 描画の経路は EXP-048 の打ち切り（2026-11-15）で外した。判定は配置の検査と撮影の判定（scripts/lib/affiliate-layout-judge.mjs）が使う。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPairOverlaps, resolvePair } from '../src/lib/affiliate-placement-core.mjs';

const AFTER = Date.parse('2026-11-02T12:00:00+09:00');

test('同じ 1 枚目・面で 2 つの組が当たれば投げ、重なりを検出する', () => {
  const base = { primary: 'buildjob', secondary: 'constwork', slots: ['article-mid'], target: { pageKind: 'doc', categories: ['laws'] }, period: { from: '2026-10-31T00:00:00+09:00', until: null } };
  const pairs = [{ ...base, id: 'PP-9001' }, { ...base, id: 'PP-9002', secondary: 'kensetsu-jobs' }];
  const rule = { id: 'PL-9', program: 'buildjob', slot: 'article-mid', target: { pageKind: 'doc' }, period: { from: '2026-10-01T00:00:00+09:00', until: null } };
  assert.throws(() => resolvePair(pairs, rule, { pageKind: 'doc', category: 'laws' }, AFTER), /PP-9001 と PP-9002/);
  assert.deepEqual(findPairOverlaps(pairs), [['PP-9001', 'PP-9002']]);
  assert.equal(resolvePair(pairs, { ...rule, program: 'dx-consulting' }, { pageKind: 'doc', category: 'laws' }, AFTER), null, '1 枚目が違えば付かない');
});
