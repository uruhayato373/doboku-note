#!/usr/bin/env node
/**
 * todo-complete.mjs — backlog カードの完了処理を1コマンドで閉じる（処方箋4の最小実装）。
 *
 * dry-run が既定。次の3条件は機械検証できないため、`--confirm-conditions` で
 * 明示的に確認済みと宣言しない限り --commit を拒否する
 * （批判的レビュー「どこか1つでも失敗したらカードとplanを保持し、完了扱いにしない」）:
 *   1. plan の受入条件と指定検証コマンドが成功している
 *   2. 外部操作を含む場合はユーザー承認とライブ実体確認がある
 *   3. 残件は別の DN-#### へ抽出済みである
 *
 * --commit が通ったら次を行う（処方箋4の機械化できる範囲）:
 *   4. dispatch-log へ ID・outcome・plan・commit・verification・note を記録する
 *   5. monthly.md / weekly.md から当該 ID の行を削除する（あれば）
 *   6. backlog カードを削除する
 *   7. claims.json から記録を消す
 *   8. schema・task-plan-links・dispatch-log の検査を再実行する
 *
 * plan ディレクトリの削除（処方箋4条件7の後半）は99-finalize-and-delete.mdの
 * 受入条件確認が要るため自動化しない。plan が残っていれば出力で明示する（自動削除しない）。
 *
 * Usage:
 *   node scripts/todo-complete.mjs DN-####                          # dry-run（チェックリスト表示のみ）
 *   node scripts/todo-complete.mjs DN-#### --confirm-conditions --commit --note "..." --verify "..."
 *
 * exit: 0 成功（dry-runの表示含む）/ 1 commit条件未達・カード不在 / 2 引数不正
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteReadiness, readClaimsStore, CLAIMS_PATH } from './lib/todo-lifecycle.mjs';
import { deleteCard } from './backlog-edit.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { listPlanUnits } from './lib/plan-units.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = '.claude/todo/backlog.md';
const MONTHLY = '.claude/todo/monthly.md';
const WEEKLY = '.claude/todo/weekly.md';
const DISPATCH_LOG = '.claude/state/dispatch/dispatch-log.json';

const argv = process.argv.slice(2);
const id = argv[0];
const COMMIT = argv.includes('--commit');
const CONFIRMED = argv.includes('--confirm-conditions');
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const note = arg('--note') || '';
const owner = arg('--owner') || 'claude-code';
const verify = arg('--verify');

if (!id || !/^DN-\d{4}$/.test(id)) {
  console.error('使い方: node scripts/todo-complete.mjs <DN-####> [--confirm-conditions --commit --note "..." --verify "..."]');
  process.exit(2);
}

const backlogText = readFileSync(BACKLOG, 'utf8');
const claimsRaw = existsSync(CLAIMS_PATH) ? readFileSync(CLAIMS_PATH, 'utf8') : null;

const readiness = checkCompleteReadiness(backlogText, claimsRaw, id);
console.log(`[todo-complete] ${id} readiness check`);
for (const c of readiness.checks) {
  const mark = c.pass === true ? '✓' : c.pass === false ? '✗' : '?';
  console.log(`  [${mark}] ${c.label}: ${c.detail}`);
}

if (!readiness.ok) {
  console.error(`\nFAIL: ${id} は機械チェックで不合格（上の✗を解消すること）`);
  process.exit(1);
}

if (!COMMIT) {
  console.log('\n--confirm-conditions --commit を付けると完了処理を実行する。');
  console.log('（?の3項目は人間/Agentが確認済みと明示するまで--commitは拒否される）');
  process.exit(0);
}

if (!CONFIRMED) {
  console.error('\nFAIL: --commit には --confirm-conditions が必須（?の3項目を確認済みと明示すること）');
  process.exit(1);
}

// ── ここから実際の完了処理 ──────────────────────────────────────────────
const card = readiness.card;

// 5. monthly.md / weekly.md から当該IDの行を削除（あれば）
for (const path of [MONTHLY, WEEKLY]) {
  if (!existsSync(path)) continue;
  const raw = readFileSync(path, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(eol);
  const kept = lines.filter((l) => !l.includes(id));
  if (kept.length !== lines.length) {
    writeFileSync(path, kept.join(eol), 'utf8');
    console.log(`[todo-complete] ${path} から ${id} を含む行を ${lines.length - kept.length} 行削除`);
  }
}

// 6. backlogカードを削除
const delResult = deleteCard(backlogText, id);
if (!delResult.ok) {
  console.error(`FAIL: ${delResult.error}`);
  process.exit(1);
}
writeFileSync(BACKLOG, delResult.text, 'utf8');
console.log(`[todo-complete] backlog.md から ${id} を削除（${delResult.removed}行）`);

// 7. claims.jsonから記録を消す
const store = readClaimsStore(claimsRaw);
store.claims = store.claims.filter((c) => c.id !== id);
writeFileSync(CLAIMS_PATH, JSON.stringify(store, null, 2) + '\n', 'utf8');

// planUnit・HEAD sha を dispatch entry へ記録する材料として先に確定させる
const planUnit = listPlanUnits(ROOT).find((u) => u.taskId === id) || null;
let headSha = null;
try { headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().slice(0, 12); } catch {}

// 4. dispatch-logへ記録
const dispatchRaw = existsSync(DISPATCH_LOG) ? readFileSync(DISPATCH_LOG, 'utf8') : null;
let dispatch;
try {
  dispatch = dispatchRaw ? JSON.parse(dispatchRaw) : { entries: [] };
  if (!Array.isArray(dispatch.entries)) dispatch.entries = [];
} catch {
  dispatch = { entries: [] };
}
dispatch.entries.push({
  id,
  at: todayJst(),
  task: card.title,
  tier: card.tier,
  executor: owner,
  outcome: 'done',
  plan: planUnit?.path ?? null,
  commit: headSha,
  verification: verify ?? null,
  note: note || 'todo-complete.mjs 経由で完了処理',
});
writeFileSync(DISPATCH_LOG, JSON.stringify(dispatch, null, 2) + '\n', 'utf8');
console.log(`[todo-complete] dispatch-log.json へ ${id} を記録`);

// plan unit が残っていれば明示する（:19-20の約束。自動削除はしない。99-finalize-and-delete.md の
// 受入条件を確認して人間/Agentが手で削除する）
if (planUnit) {
  console.warn(`WARN: plan unit が残っている: ${planUnit.path}`);
  console.warn('  99-finalize（受入条件）を確認して手で削除すること（自動削除はしない）');
}

// 8. 検査再実行
try {
  execFileSync('node', ['scripts/check-backlog-schema.mjs'], { stdio: 'inherit' });
  execFileSync('node', ['scripts/check-task-plan-links.mjs'], { stdio: 'inherit' });
  execFileSync('node', ['scripts/check-dispatch-log.mjs'], { stdio: 'inherit' });
} catch {
  console.error(`\n[todo-complete] 事後検査が失敗した。${id} の削除で構造を壊していないか確認すること。`);
  process.exit(1);
}

console.log(`\n[todo-complete] ${id} 完了処理OK`);
