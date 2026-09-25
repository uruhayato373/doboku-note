#!/usr/bin/env node
/**
 * check-tensaku-reply.mjs — 添削・診断・作成の顧客返信文を送信前に機械検査する
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   返信文は顧客へそのまま届く。意味の評価（指摘は正しいか・言い過ぎていないか）は
 *   Evaluator `civil-keiken-tensaku-qa` が担い、ここは白黒のつくゲートだけを見る。
 *   判定の実装は scripts/lib/tensaku-reply-guards.mjs（R1〜R6 の定義もそちら）。
 *
 * 使い方:
 *   node scripts/check-tensaku-reply.mjs <返信文> --source <提出原稿> [--grade 1|2] [--json]
 *   --source を省くと R6（数値の出典）は「未検査」と表示する（PASS にはしない）
 *   --grade を省くと R5 の上限・下限判定は「未検査」（表記と実字数の一致だけ見る）
 *
 * exit: 0=問題なし / 1=要修正 / 2=検査不成立（ファイルが読めない・--source なし）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReply } from './lib/tensaku-reply-guards.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIMITS_PATH = join(ROOT, '.claude/config/keiken-answer-sheet-limits.json');
const TAG = '[check-tensaku-reply]';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const AS_JSON = argv.includes('--json');
const replyPath = argv.find((a, i) => !a.startsWith('--') && !['--source', '--grade'].includes(argv[i - 1]));
const sourcePath = opt('--source');
const grade = opt('--grade');

function fail2(msg) {
  console.error(`${TAG} 検査不成立: ${msg}`);
  process.exitCode = 2;
}

if (!replyPath || !existsSync(replyPath)) {
  fail2(`返信文が見つからない: ${replyPath ?? '(未指定)'}`);
} else if (sourcePath && !existsSync(sourcePath)) {
  fail2(`提出原稿が見つからない: ${sourcePath}`);
} else if (grade && !['1', '2'].includes(grade)) {
  fail2(`--grade は 1 か 2: ${grade}`);
} else {
  const reply = readFileSync(replyPath, 'utf8');
  const source = sourcePath ? readFileSync(sourcePath, 'utf8') : null;
  let maxChars = null;
  let minRatio = 0.8;
  if (grade) {
    const g = JSON.parse(readFileSync(LIMITS_PATH, 'utf8')).grades[`civil-${grade}`];
    maxChars = g.limits.current2_q1.maxChars;
    minRatio = g.minimum_fill_ratio;
  }
  const r = checkReply(reply, { source, maxChars, minRatio });

  if (AS_JSON) {
    process.stdout.write(JSON.stringify({ replyPath, sourcePath, grade, ...r }, null, 2) + '\n');
  } else {
    const { stats } = r;
    console.log(`${TAG} 返信文 ${stats.length} 字（上限 3000）`);
    console.log(`${TAG} 書き換え例 ${stats.rewriteBlocks} 件を実検査` +
      (maxChars != null ? `（解答欄 ${maxChars} 字・${minRatio * 100}%以上）` : '（--grade なし: 上限・下限は未検査）'));
    for (const b of stats.blocks) console.log(`    ${b.actual} 字（表記 ${b.declared}）: ${b.heading}`);
    console.log(stats.facts.checked
      ? `${TAG} 工事の数値 ${stats.facts.inspected} 件を実検査・原稿に実在 ${stats.facts.grounded} 件`
      : `${TAG} 工事の数値は未検査（--source なし）`);
    if (r.ok) console.log(`${TAG} ✓ 違反なし`);
    else {
      console.log(`${TAG} ✗ 要修正 ${r.violations.length} 件`);
      for (const v of r.violations) console.log(`  - [${v.code}] ${v.message}`);
    }
  }
  if (!sourcePath) process.exitCode = 2;
  else if (!r.ok) process.exitCode = 1;
}
