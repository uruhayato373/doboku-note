#!/usr/bin/env node
/**
 * todo-release.mjs — claim済みbacklogカードのclaimを解除する（処方箋3）。
 *
 * blocked時・作業中断時に使う。[進行中] を外し claims.json の記録を消す。
 * 理由と再開条件は呼び出し側がbacklogカード本文へ書く（本コマンドはトークンの
 * 付け外しだけを担当し、文章判断はしない）。
 *
 * Usage:
 *   node scripts/todo-release.mjs DN-#### [--reason "..."]
 *
 * exit: 0 成功 / 1 claimされていない・カード不在 / 2 引数不正
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { releaseTask, CLAIMS_PATH } from './lib/todo-lifecycle.mjs';

const BACKLOG = '.claude/todo/backlog.md';
const argv = process.argv.slice(2);
const id = argv[0];
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const reason = arg('--reason');

if (!id || !/^DN-\d{4}$/.test(id)) {
  console.error('使い方: node scripts/todo-release.mjs <DN-####> [--reason "..."]');
  process.exit(2);
}

const backlogText = readFileSync(BACKLOG, 'utf8');
const claimsRaw = existsSync(CLAIMS_PATH) ? readFileSync(CLAIMS_PATH, 'utf8') : null;

const result = releaseTask(backlogText, claimsRaw, id, { reason });
if (!result.ok) {
  console.error(`FAIL: ${result.error}`);
  process.exit(1);
}

writeFileSync(BACKLOG, result.text, 'utf8');
writeFileSync(CLAIMS_PATH, JSON.stringify(result.claimsStore, null, 2) + '\n', 'utf8');
console.log(`[release] ${id}${reason ? `  reason=${reason}` : ''}`);
console.log('  backlog.md から [進行中] を除去・claims.json の記録を消した');
