import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const run = (code) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: REPO_ROOT, encoding: 'utf8' }));

test('インフィード広告の位置: 10 項目ごと・最大 2 枠・先頭と末尾に置かない・10 項目以下は 0 枠', () => {
  const r = run(`import { withFeedAds } from './src/lib/feed-ads.ts';
    const feedAdPositions = (n, opts = {}) => withFeedAds(Array.from({ length: n }, (_, i) => i), { key: 'k', ...opts }).flatMap((e, i, all) => e.kind === 'ad' ? [all[i - 1].index] : []);
    process.stdout.write(JSON.stringify({ n9: feedAdPositions(9), n10: feedAdPositions(10), n11: feedAdPositions(11), n17: feedAdPositions(17), n40: feedAdPositions(40), search10: feedAdPositions(10, { first: 5, max: 1 }), search5: feedAdPositions(5, { first: 5, max: 1 }) }));`);
  assert.deepEqual(r.n9, []);
  assert.deepEqual(r.n10, [], '10 項目ちょうどは末尾になるので置かない');
  assert.deepEqual(r.n11, [9]);
  assert.deepEqual(r.n17, [9]);
  assert.deepEqual(r.n40, [9, 19], '1 つの一覧で最大 2 枠');
  assert.deepEqual(r.search10, [4], '検索結果は 5 件目の後に 1 枠');
  assert.deepEqual(r.search5, [], '5 件だけなら末尾なので置かない');
});

test('withFeedAds: 広告の前後は必ず項目・ページの残り枠（budget）を超えない', () => {
  const r = run(`import { withFeedAds } from './src/lib/feed-ads.ts';
    const budget = { left: 3 };
    const a = withFeedAds(Array.from({ length: 30 }, (_, i) => i), { key: 'a', budget });
    const b = withFeedAds(Array.from({ length: 30 }, (_, i) => i), { key: 'b', budget });
    process.stdout.write(JSON.stringify({ a: a.map(e => e.kind), b: b.map(e => e.kind), left: budget.left }));`);
  for (const seq of [r.a, r.b]) {
    seq.forEach((kind, i) => { if (kind === 'ad') { assert.equal(seq[i - 1], 'item'); assert.equal(seq[i + 1], 'item'); } });
  }
  assert.equal(r.a.filter((k) => k === 'ad').length + r.b.filter((k) => k === 'ad').length, 3, 'ページで 3 枠まで');
  assert.equal(r.left, 0);
});
