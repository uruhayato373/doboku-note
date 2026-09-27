#!/usr/bin/env node
/**
 * check-review-wiring.mjs — 週次・月次レビューのスキルが実行するコマンドと、配線の正本（.claude/config/review-wiring.json）の一致を検査する
 * ---------------------------------------------------------------------------
 * スキルにコマンドを足したのに正本へ書かない（管理画面の配線図に出ない）・正本だけ残る、を止める。
 * 終了コード: 0 = 一致 / 1 = 食い違い / 2 = 正本かスキルを読めない（検査不成立）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, diffWiring, validateWiring } from './lib/review-wiring.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let config;
try {
  config = JSON.parse(readFileSync(join(ROOT, CONFIG), 'utf8'));
} catch (e) {
  console.error(`[check-review-wiring] 正本を読めない: ${e.message} — 検査不成立`);
  process.exit(2);
}
const errors = validateWiring(config);
let checked = 0;
for (const [cadence, c] of Object.entries(config.cadences)) {
  const p = join(ROOT, c.skill);
  if (!existsSync(p)) {
    console.error(`[check-review-wiring] ${cadence}: スキル ${c.skill} が無い — 検査不成立`);
    process.exit(2);
  }
  const { missing, extra } = diffWiring(c.inputs, readFileSync(p, 'utf8'));
  checked += c.inputs.length;
  for (const m of missing) errors.push(`${cadence}: スキルが実行する ${m} が正本に無い（review-wiring.json の inputs に stage・role 付きで足す）`);
  for (const x of extra) errors.push(`${cadence}: 正本の ${x} をスキルが実行していない（スキルから外したなら正本からも外す）`);
}
console.log(`[check-review-wiring] レビュー ${Object.keys(config.cadences).length} 種 / 入力 ${checked} 件を実検査 / 食い違い ${errors.length} 件`);
for (const e of errors) console.error(`  ✗ ${e}`);
if (errors.length) process.exit(1);
console.log('[check-review-wiring] ✓ スキルの実行コマンドと配線の正本は一致');
