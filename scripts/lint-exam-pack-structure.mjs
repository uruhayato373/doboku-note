#!/usr/bin/env node
/**
 * lint-exam-pack-structure.mjs
 *
 * Instagram カルーセル過去問パック (_exam-packs) の slide-data.json を構造検査。
 * 散文に埋もれた列挙データや markdown 表残骸を機械的に検出する。
 *
 * 検出ルール（ERROR）:
 *   E1: problem.bodyLines に「（ア〜カ）」「（A〜E）」を含む行が複数あるのに lists 未設定
 *       → 並列列挙データが散文に埋もれている。lists フィールドに分離すべき
 *   E2: problem.bodyLines に `|` で始まる行（markdown 表残骸）があるのに table 未設定
 *       → table フィールドに構造化すべき
 *   E3: problem が最大圧縮(ultra + 表×0.62)でもコンテンツ領域(1014px)に収まらない
 *       → 選択肢が画面外へはみ出す。本文を短縮 or 表行数を削減すべき
 *       （quiz-slides.mjs の chooseProblemLayout を共有＝生成物と検査が一致）
 *
 * 検出ルール（WARN）:
 *   W1: answer.optionExplanations に「個別解説は省略」プレースホルダが残存
 *       → r07-primary MDX から自動補完 or writer が手で補完
 *
 * Usage:
 *   node scripts/lint-exam-pack-structure.mjs                # 全パック
 *   node scripts/lint-exam-pack-structure.mjs r07            # 特定年度のみ
 *   node scripts/lint-exam-pack-structure.mjs r07/pack-03    # 特定パックのみ
 *   node scripts/lint-exam-pack-structure.mjs --strict       # WARN も exit 非0
 *
 * 終了コード:
 *   0: 違反なし
 *   1: ERROR あり（--strict 時は WARN も）
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseProblemLayout } from '../.claude/scripts/lib/sns-common/quiz-slides.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXAM_KEYS = ['cem', 'pe-first-stage', 'civil-1', 'civil-2', 'pe-construction'];
const BASE_MAP = Object.fromEntries(
  EXAM_KEYS.map((k) => [k, join(ROOT, 'content/sns/instagram', k, 'exam-packs')]),
);
const examArg = process.argv.find((a) => a.startsWith('--exam='))?.split('=')[1] || 'cem';
const BASE = BASE_MAP[examArg] ?? BASE_MAP.cem;

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const targetArg = args.find((a) => !a.startsWith('--'));

// 列挙パターン: 「（ア）」「（A）」など全角丸括弧囲み 1 文字
const ENUM_RE = /（[ア-カA-E]）/g;

function countDistinctEnumMarks(text) {
  const set = new Set();
  let m;
  while ((m = ENUM_RE.exec(text)) !== null) set.add(m[0]);
  return set.size;
}

function lintPack(packDir, packId) {
  const errors = [];
  const warnings = [];
  const path = join(packDir, 'slide-data.json');
  if (!existsSync(path)) return { errors, warnings };

  const data = JSON.parse(readFileSync(path, 'utf8'));
  for (const sl of data.slides || []) {
    const qNum = sl.qNum ?? '?';

    if (sl.type === 'problem') {
      const body = (sl.bodyLines || []).join('');
      // E1: 列挙パターン未対応
      const enumCount = countDistinctEnumMarks(body);
      if (enumCount >= 2 && !sl.lists) {
        errors.push({
          rule: 'E1',
          where: `${packId} Q${qNum}`,
          msg: `bodyLines に ${enumCount} 個の列挙パターン（${[...body.matchAll(ENUM_RE)].slice(0, 4).map(m => m[0]).join('')}...）があるのに lists が未設定`,
          fix: 'lists: [{ items: ["（ア）...", "（イ）..."] }] フィールドに分離する',
        });
      }
      // E2: markdown 表残骸
      const lines = (sl.bodyLines || []).flatMap((l) => l.split(/\r?\n/));
      const tableLines = lines.filter((l) => l.trim().includes('|'));
      if (tableLines.length >= 2 && !sl.table) {
        errors.push({
          rule: 'E2',
          where: `${packId} Q${qNum}`,
          msg: `bodyLines に ${tableLines.length} 行の markdown 表残骸があるのに table が未設定`,
          fix: 'table: { headers: [...], rows: [...] } フィールドに構造化する',
        });
      }
      // E3: 最大圧縮でもコンテンツ領域に収まらない（選択肢のはみ出し）
      const layout = chooseProblemLayout(sl);
      if (!layout.fits) {
        errors.push({
          rule: 'E3',
          where: `${packId} Q${qNum}`,
          msg: `最大圧縮(${layout.mode} + 表×${layout.tableScale})でも推定 ${layout.estHeight}px > 領域 ${layout.avail}px ではみ出す`,
          fix: '本文(bodyLines)を短縮、または table の行数を削減する',
        });
      }
    }

    if (sl.type === 'answer') {
      // W1: プレースホルダ残存
      const placeholders = (sl.optionExplanations || []).filter(
        (e) => e?.text === '個別解説は省略' || e?.text === '個別解説は省略。',
      );
      if (placeholders.length > 0) {
        warnings.push({
          rule: 'W1',
          where: `${packId} Q${qNum}`,
          msg: `optionExplanations に「個別解説は省略」プレースホルダが ${placeholders.length} 個残存（選択肢 ${placeholders.map(p => p.num).join(',')}）`,
          fix: 'r07-primary MDX の解説を移植 or writer エージェントで手動補完',
        });
      }
    }
  }
  return { errors, warnings };
}

// 走査対象を解決
function* iterPacks(target) {
  if (!existsSync(BASE)) return;
  const yearDirs = readdirSync(BASE).filter((y) => /^[hr]\d+$/.test(y));
  for (const year of yearDirs) {
    if (target && !target.startsWith(year)) continue;
    const yearDir = join(BASE, year);
    const packs = readdirSync(yearDir).filter((p) => /^pack-\d+$/.test(p));
    for (const pack of packs) {
      const packId = `${year}/${pack}`;
      if (target && target !== year && target !== packId) continue;
      const packDir = join(yearDir, pack);
      if (statSync(packDir).isDirectory()) yield { packDir, packId };
    }
  }
}

const allErrors = [];
const allWarnings = [];
let packCount = 0;
for (const { packDir, packId } of iterPacks(targetArg)) {
  packCount++;
  const { errors, warnings } = lintPack(packDir, packId);
  allErrors.push(...errors);
  allWarnings.push(...warnings);
}

const fmt = (entry) =>
  `  [${entry.rule}] ${entry.where}\n    ${entry.msg}\n    → ${entry.fix}`;

if (allErrors.length > 0) {
  console.error('=== ERRORS ===');
  for (const e of allErrors) console.error(fmt(e));
  console.error('');
}
if (allWarnings.length > 0) {
  console.warn('=== WARNINGS ===');
  for (const w of allWarnings) console.warn(fmt(w));
  console.warn('');
}

console.log(`Scanned ${packCount} pack(s)`);
console.log(`  errors:   ${allErrors.length}`);
console.log(`  warnings: ${allWarnings.length}`);

if (allErrors.length > 0) process.exit(1);
if (strict && allWarnings.length > 0) process.exit(1);
