#!/usr/bin/env node
/**
 * coconala-local-routine.mjs — 土曜の Mac の収集（weekly-collect の coconala 段）が回すココナラの read-only 取得
 * ---------------------------------------------------------------------------
 * なぜ Mac か（2026-10-11）:
 *   GitHub hosted runner からのココナラは 403 Forbidden（run 38106927733: 保存したログイン状態を渡しても
 *   /mypage が 403）。9/30 から CI の coconala が止まっていた原因。ログイン済みの Mac 自身で取る。
 *
 * 1 回の実行でやること（scripts/weekly-collect.mjs が収集用 worktree＝最新の develop で呼ぶ）:
 *   1. coconala-orders（取引一覧）・coconala-analytics --append-kpi（出品分析）・coconala-revenue（売上履歴＝月の受取額）
 *   2. 台帳（coconala.orders-snapshot・analytics・kpi・revenue）を commit して develop へ push
 *   未ログインなら macOS の通知で知らせる。止まった週は日次 ops 点検（check-sales-freshness・check-coconala-analytics）が拾う。
 *
 * CLI（専用 worktree のルートで実行する。ブランチに乗った HEAD では --dry-run 以外を拒否する）:
 *   node scripts/coconala-local-routine.mjs              # 本番（取得・commit・push）
 *   node scripts/coconala-local-routine.mjs --dry-run    # 取得の dry-run（売上履歴は書かない）・commit しない
 *   node scripts/coconala-local-routine.mjs --no-push    # commit まで
 * exit: 0 = 全部取れた / 1 = どこかで失敗・要ログイン / 2 = ブランチに乗った checkout で本番を叩いた
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { datasetPath } from './lib/datasets.mjs';
import { commitAndPush, onBranch } from './lib/routine-commit.mjs';

const DRY = process.argv.includes('--dry-run');
const NO_PUSH = process.argv.includes('--no-push');
const TAG = '[coconala-local]';
const LEDGER_PATHS = ['coconala.orders-snapshot', 'coconala.analytics', 'coconala.kpi', 'coconala.revenue'].map((id) => datasetPath(id));

const run = (args) => spawnSync('node', args, { stdio: 'inherit', env: process.env }).status ?? 1;
function notify(message) {
  if (process.platform !== 'darwin') return;
  spawnSync('osascript', ['-e', `display notification "${message}" with title "doboku-note ココナラ"`]);
}

if (!DRY && onBranch()) {
  console.error(`${TAG} ✗ ブランチに乗った checkout では動かさない（今いるブランチに commit してしまう）。収集用 worktree で \`node scripts/weekly-collect.mjs --only coconala\` を回すか --dry-run で試す。`);
  process.exit(2);
}

const problems = [];
const done = [];
for (const [label, args] of [
  ['取引一覧', ['scripts/coconala-orders.mjs', '--headless']],
  ['出品分析', ['scripts/coconala-analytics.mjs', '--headless', ...(DRY ? [] : ['--append-kpi'])]],
  ['売上履歴', ['scripts/coconala-revenue.mjs', '--headless', ...(DRY ? ['--dry-run'] : [])]],
]) {
  const code = run(args);
  if (code === 0) done.push(label);
  else problems.push(`${label}: exit ${code}（ログインが切れていれば npm run auth:login -- --service coconala）`);
}
if (problems.length === 3) notify('ココナラの取得がすべて失敗。ログインを確認: npm run auth:login -- --service coconala');

if (DRY) {
  console.log(`${TAG} --dry-run のため commit しない`);
} else {
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const r = commitAndPush(LEDGER_PATHS, `chore(coconala-local): ${done.join('・') || 'ココナラ定期取得'} ${stamp} [skip ci]`, { push: !NO_PUSH });
  if (r.problem) problems.push(r.problem);
  else console.log(`${TAG} ${r.status === 'pushed' ? 'develop へ push した' : r.status === 'committed' ? '--no-push のため push しない' : '台帳に差分なし。commit しない'}`);
}

if (problems.length) {
  console.error(`${TAG} ✗ ${problems.length} 件の問題:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`${TAG} ✓ 完了（${done.join('・')}）`);
}
