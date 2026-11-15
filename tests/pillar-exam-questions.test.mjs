import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';

// 総監の 5 管理のページに出す「この管理の過去問」（DN-1220）。集計のキーと年度の表記
const { pillarKeyOf, examYearLabel } = await loadTsModule('src/lib/pillar-exam-questions.ts');

test('ピラーの slug から集計のキーを引く', () => {
  assert.equal(pillarKeyOf('pe-comprehensive-management-economic-management-pillar'), 'economic');
  assert.equal(pillarKeyOf('social-environment-management-pillar'), 'social-environment');
  assert.equal(pillarKeyOf('pe-comprehensive-management-r08-primary'), null);
});

test('年度の表記', () => {
  assert.equal(examYearLabel('r08'), '令和8年度');
  assert.equal(examYearLabel('h30'), '平成30年度');
});
