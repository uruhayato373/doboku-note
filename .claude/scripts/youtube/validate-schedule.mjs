#!/usr/bin/env node
/**
 * youtube-schedule.json の整合性バリデーター。
 * CI の pre-check として実行し、問題があれば exit 1 で abort させる。
 *
 * チェック項目:
 *   1. publishAt の重複（同一時刻に2本以上）
 *   2. 同一日の本数が meta.perDay を超過
 *   3. videoId の重複（同じ動画が2エントリに紐付く）
 *   4. uploaded なのに videoId がない（台帳破損）
 *   5. pending なのに publishAt が過去30日以上前（取りこぼし警告）
 */

import { readFileSync } from 'node:fs';

const LEDGER = '.claude/state/youtube-schedule.json';
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const { meta, items } = ledger;
const PER_DAY = meta?.perDay ?? 3;

let errors = 0;
let warnings = 0;

function err(msg) { console.error(`  [ERROR] ${msg}`); errors++; }
function warn(msg) { console.warn(`  [WARN]  ${msg}`); warnings++; }

// 1. publishAt 重複チェック
const publishAtMap = {};
for (const item of items) {
  if (!item.publishAt) { err(`${item.key}: publishAt が未設定`); continue; }
  if (publishAtMap[item.publishAt]) {
    err(`publishAt 重複: ${item.publishAt} → ${publishAtMap[item.publishAt]} と ${item.key}`);
  }
  publishAtMap[item.publishAt] = item.key;
}

// 2. 同日の本数チェック
const perDayCount = {};
for (const item of items) {
  const day = (item.publishAt || '').substring(0, 10);
  perDayCount[day] = (perDayCount[day] || 0) + 1;
}
for (const [day, count] of Object.entries(perDayCount)) {
  if (count > PER_DAY) {
    err(`${day}: ${count}本（上限 ${PER_DAY}本/日を超過）`);
  }
}

// 3. videoId 重複チェック
const videoIdMap = {};
for (const item of items) {
  if (!item.videoId) continue;
  if (videoIdMap[item.videoId]) {
    err(`videoId 重複: ${item.videoId} → ${videoIdMap[item.videoId]} と ${item.key}`);
  }
  videoIdMap[item.videoId] = item.key;
}

// 4. uploaded なのに videoId がない
for (const item of items) {
  if (item.status === 'uploaded' && !item.videoId) {
    err(`${item.key}: status=uploaded だが videoId がない（台帳破損）`);
  }
}

// 5. pending なのに publishAt が過去30日以上前（取りこぼし）
const threshold = Date.now() - 30 * 86400000;
for (const item of items) {
  if (item.status === 'pending' && new Date(item.publishAt).getTime() < threshold) {
    warn(`${item.key}: publishAt=${item.publishAt} が30日以上前なのに pending（取りこぼし？）`);
  }
}

// 結果
console.log(`validate-schedule: ${items.length}件チェック → エラー ${errors}件 / 警告 ${warnings}件`);
if (errors > 0) {
  console.error('バリデーション失敗。台帳を修正してから再実行してください。');
  process.exit(1);
}
console.log('OK');
