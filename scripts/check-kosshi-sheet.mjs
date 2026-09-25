#!/usr/bin/env node
/**
 * check-kosshi-sheet.mjs — 指導サービスの骨子シートを送信前に機械検査する
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   骨子シートに答案の文章が紛れ込むと代筆（代行）になり、ココナラ運営の取り下げ対象になる
 *   （2026-09-25 に作成サービスが「学校の課題の代行」として取り下げられた）。
 *   「答案の文を書いていない」「事実はすべて本人の回答から」を白黒で止める。
 *   判定の実装は scripts/lib/kosshi-sheet-guards.mjs（K1〜K6 の定義もそちら）。
 *   意味の評価は civil-keiken-tensaku-qa（mode=kosshi）が担う。
 *
 * 使い方:
 *   node scripts/check-kosshi-sheet.mjs <骨子シート> --source <ヒアリングシート> [--json]
 *
 * exit: 0=問題なし / 1=要修正 / 2=検査不成立（ファイルが読めない・--source なし）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { checkKosshiSheet, MESSAGE_MAX_CHARS, OWN_TEXT_MAX } from './lib/kosshi-sheet-guards.mjs';

const TAG = '[check-kosshi-sheet]';
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const AS_JSON = argv.includes('--json');
const sheetPath = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--source');
const sourcePath = opt('--source');

function fail2(msg) {
  console.error(`${TAG} 検査不成立: ${msg}`);
  process.exitCode = 2;
}

if (!sheetPath || !existsSync(sheetPath)) {
  fail2(`骨子シートが見つからない: ${sheetPath ?? '(未指定)'}`);
} else if (sourcePath && !existsSync(sourcePath)) {
  fail2(`ヒアリングシートが見つからない: ${sourcePath}`);
} else {
  const sheet = readFileSync(sheetPath, 'utf8');
  const source = sourcePath ? readFileSync(sourcePath, 'utf8') : null;
  const r = checkKosshiSheet(sheet, { source });

  if (AS_JSON) {
    process.stdout.write(JSON.stringify({ sheetPath, sourcePath, ...r }, null, 2) + '\n');
  } else {
    const { stats } = r;
    console.log(`${TAG} 骨子シート ${stats.length} 字（${stats.fitsMessage ? 'メッセージ欄に収まる' : `メッセージ欄 ${MESSAGE_MAX_CHARS} 字超＝ファイル添付で送る`}）`);
    console.log(`${TAG} 検査対象 ${stats.sections} 節（テーマ ${stats.themes}）・${stats.lines} 行を実検査（地の文 ${OWN_TEXT_MAX} 字以内）`);
    console.log(stats.quotes.checked
      ? `${TAG} 引用 ${stats.quotes.inspected} 件を実検査・ヒアリングシートに実在 ${stats.quotes.grounded} 件`
      : `${TAG} 引用は未検査（--source なし）`);
    console.log(stats.facts.checked
      ? `${TAG} 工事の数値 ${stats.facts.inspected} 件を実検査・ヒアリングシートに実在 ${stats.facts.grounded} 件`
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
