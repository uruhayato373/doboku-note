import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';

// 総監の 5 管理のページに出す「この管理の過去問」（DN-1220）の年度の表記。表示は build 後の out/ で確かめる
const { examYearLabel } = await loadTsModule('src/lib/pillar-exam-questions.ts');

test('年度の表記', () => {
  assert.equal(examYearLabel('r08'), '令和8年度');
  assert.equal(examYearLabel('h30'), '平成30年度');
});
