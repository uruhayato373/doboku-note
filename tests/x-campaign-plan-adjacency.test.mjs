// 2026-10-12: check-x-campaign-plan の「販売投稿の連続」は計画ファイル 1 本の中だけで判定する。
// 実際の予約で他の計画の非販売投稿が間に入っていると確かめたときだけ、salesAdjacencyReason で WARN に下げられる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts/check-x-campaign-plan.mjs');
const base = JSON.parse(readFileSync(join(REPO_ROOT, 'content/sns/x/campaigns/2026-10-civil2-lastweek.json'), 'utf8'));

function run(mutate) {
  const plan = structuredClone(base);
  // 実データの計画に既に書かれた理由に左右されないよう、免除を全部外してから変える
  for (const post of plan.posts) delete post.salesAdjacencyReason;
  mutate(plan);
  const dir = mkdtempSync(join(tmpdir(), 'xplan-'));
  const file = join(dir, 'plan.json');
  writeFileSync(file, JSON.stringify(plan, null, 2));
  const r = spawnSync(process.execPath, [SCRIPT, file], { cwd: REPO_ROOT, encoding: 'utf8' });
  return `${r.stdout}\n${r.stderr}`;
}

// 1 本目（販売）の直後の 2 本目を販売に変える
const salesAt = (plan, i) => {
  const sales = plan.posts.find((p) => p.funnel === 'note' && p.target);
  Object.assign(plan.posts[i], { funnel: sales.funnel, target: sales.target, type: '販売' });
};

test('計画内で販売投稿が隣り合うと NG（理由が無い）', () => {
  const out = run((p) => salesAt(p, 1));
  assert.match(out, /販売投稿が連続: /);
});

test('salesAdjacencyReason があれば NG にせず理由付きの WARN にする', () => {
  const out = run((p) => { salesAt(p, 1); p.posts[1].salesAdjacencyReason = '2026-10-12 に X の予約一覧で確認。前後に別計画の学習点検 2 本が入る'; });
  assert.doesNotMatch(out, /販売投稿が連続: /);
  assert.match(out, /販売投稿が計画内で連続（理由付き）/);
});

test('理由が短すぎれば NG のまま（空の免除を許さない）', () => {
  const out = run((p) => { salesAt(p, 1); p.posts[1].salesAdjacencyReason = 'ok'; });
  assert.match(out, /販売投稿が連続: /);
});
