// 公開 URL（/topics・/standards・/exam）をテンプレート文字列で組み立てる直書きを増やさない（2026-10-27 に 32 か所を src/lib/route-paths.ts へ寄せた）。
// 組み立ての関数そのものと、形の違う URL（記事の正規パス・公的基準の節・目次 JSON）だけを許す。減らすのは自由、増えたら落ちる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const ALLOWED = new Map([
  ['src/lib/route-paths.ts', 'トピック・資格ハブ・公的基準の組み立ての正本'],
  ['src/lib/content-routes.ts', '記事の正規パス（/exam/<資格>/<種別>/<slug>）の正本'],
  ['src/lib/standards-section-split.mjs', '公的基準の節のパス（スクリプトと共有する .mjs）'],
  ['src/lib/standards-tree-nav.ts', '公的基準の目次 JSON の置き場（ページではない）'],
]);

test('src で /topics・/standards・/exam の URL を組み立てるのは route-paths.ts などの正本だけ', () => {
  const out = execFileSync('git', ['grep', '-n', '-E', '`/(topics|standards|exam)/\\$\\{', '--', ':(glob)src/**'], { cwd: REPO_ROOT, encoding: 'utf8' });
  const hits = out.split('\n').filter(Boolean).map((line) => line.replace(/\\/g, '/'));
  assert.ok(hits.length > 0, 'git grep が何も返さない（正本の組み立ても見えていない＝検査が空振り）');
  const outside = hits.filter((line) => !ALLOWED.has(line.split(':')[0]));
  assert.deepEqual(outside, [], `URL の組み立ては src/lib/route-paths.ts の関数を使う:\n${outside.join('\n')}`);
});
