#!/usr/bin/env node
/**
 * todo-claim.mjs — backlog カードを claim する共通コマンド（処方箋3の最小実装）。
 *
 * Agent は実装着手前に必ずこれを実行する。カード存在・未claim（[進行中]無し・
 * claims.json未記録の両方）を確認してから [進行中] を付け、owner/開始時刻を記録する。
 *
 * Usage:
 *   node scripts/todo-claim.mjs DN-#### --owner claude-code
 *   node scripts/todo-claim.mjs DN-#### --owner claude-code --branch feature/xxx
 *
 * exit: 0 成功 / 1 既にclaim済み・カード不在 / 2 引数不正
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { claimTask, CLAIMS_PATH } from './lib/todo-lifecycle.mjs';

const BACKLOG = '.claude/todo/backlog.md';
const argv = process.argv.slice(2);
const id = argv[0];
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const owner = arg('--owner');
const branch = arg('--branch');

if (!id || !/^DN-\d{4}$/.test(id) || !owner) {
  console.error('使い方: node scripts/todo-claim.mjs <DN-####> --owner <name> [--branch <name>]');
  process.exit(2);
}

const backlogText = readFileSync(BACKLOG, 'utf8');
const claimsRaw = existsSync(CLAIMS_PATH) ? readFileSync(CLAIMS_PATH, 'utf8') : null;

const result = claimTask(backlogText, claimsRaw, id, owner, { branch });
if (!result.ok) {
  console.error(`FAIL: ${result.error}`);
  process.exit(1);
}

writeFileSync(BACKLOG, result.text, 'utf8');
writeFileSync(CLAIMS_PATH, JSON.stringify(result.claimsStore, null, 2) + '\n', 'utf8');
console.log(`[claim] ${id}  owner=${owner}${branch ? `  branch=${branch}` : ''}`);
console.log(`  backlog.md へ [進行中] を追加・${CLAIMS_PATH} へ記録した`);
