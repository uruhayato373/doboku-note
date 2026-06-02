#!/usr/bin/env node
// 施工経験記述（1級・2級土木 第2次検定 問題1）の答案段落を解答欄しきい値で機械チェックする。
// 決定論的処理（CLAUDE.md 原則5）。判定は Evaluator(civil-keiken-essay-qa)、修正は Generator(civil-keiken-essay-writer)。
//
// 使い方:
//   node scripts/keiken-charcount.mjs [path ...] [--json] [--strict]
//     path 省略時: docs/note/{1級,2級}土木/magazines 配下の「経験記述」を含む article.md を全走査
//     --json   : 機械可読 JSON を出力（Evaluator 連携用）
//     --strict : OVER が1件でもあれば exit 1（ゲート用途）
//
// しきい値の真実源: .claude/config/keiken-answer-sheet-limits.json（公式行数確定までは暫定）

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, '.claude/config/keiken-answer-sheet-limits.json');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const inputs = args.filter((a) => !a.startsWith('--'));

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
const LIMITS = config.limits;
const PROVISIONAL = !!(config._meta && config._meta.provisional);

// --- 走査対象の article.md を集める -----------------------------------------
function walk(dir, acc) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name === 'article.md') acc.push(p);
  }
}

function defaultTargets() {
  const acc = [];
  for (const base of ['docs/note/1級土木/magazines', 'docs/note/2級土木/magazines']) {
    const abs = join(ROOT, base);
    if (existsSync(abs)) walk(abs, acc);
  }
  // 「経験記述」を含むパスのみ（マガジン種別を限定）
  return acc.filter((p) => p.includes('経験記述'));
}

let files = [];
if (inputs.length === 0) {
  files = defaultTargets();
} else {
  for (const inp of inputs) {
    const abs = join(ROOT, inp);
    if (!existsSync(abs)) {
      console.error(`[warn] not found: ${inp}`);
      continue;
    }
    if (statSync(abs).isDirectory()) walk(abs, files);
    else files.push(abs);
  }
}
files.sort();

// --- 答案段落の抽出 ----------------------------------------------------------
function stripFrontmatter(txt) {
  if (txt.startsWith('---')) {
    const end = txt.indexOf('\n---', 3);
    if (end !== -1) return txt.slice(txt.indexOf('\n', end + 1) + 1);
  }
  return txt;
}

// markdown 装飾・タグを除いた実文字数（プレースホルダ 〇 は算入、空白は除外）
function countChars(s) {
  const clean = s
    .replace(/<[^>]+>/g, '') // <sup> 等タグ
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/\s/g, '');
  return [...clean].length;
}

// 答案マーカーを検出して設問番号('1'|'2'|'3')または'記述例'を返す。非マーカーは null。
// 形式: (a) **(N) ... 太字マーカー  (b) ### …(N)… 見出し（条件提示型）  (c) ### 記述例（予想問題）
function markerKind(line) {
  const s = line.trim();
  const bold = s.match(/^\*\*\((\d)\)/);
  if (bold) return { num: bold[1] };
  if (s.startsWith('#')) {
    if (/記述例/.test(s)) return { num: 'yosou' };
    const h = s.match(/[（(](\d)[）)]/); // 〔設問2〕(1) 等。（記入例）等は数字なしで除外
    if (h) return { num: h[1] };
  }
  return null;
}

// マーカー直後から「次のマーカー or 次の見出し(#)」までを答案ブロックとして収集。
// リスト記号は除去して中身は算入、blockquote(>)編集注記・hr(---)は除外。
function gatherBlock(lines, start) {
  let j = start;
  const buf = [];
  while (j < lines.length && lines[j].trim() === '') j++;
  while (j < lines.length) {
    const raw = lines[j];
    const s = raw.trim();
    if (markerKind(raw) || s.startsWith('#')) break; // 次の設問 or 次セクション
    if (s === '' || s.startsWith('>') || s.startsWith('---')) {
      j++;
      continue;
    }
    const text = s.replace(/^(\d+\.\s+|[-*]\s+)/, ''); // リスト記号を除去、中身は算入
    buf.push(text);
    j++;
  }
  return { text: buf.join(''), next: j };
}

function extractAnswers(body) {
  const lines = body.split(/\r?\n/);
  // 旧3項目形式判定: 設問(3)マーカーが存在するか
  const isLegacy3 = lines.some((l) => {
    const k = markerKind(l);
    return k && k.num === '3';
  });
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const k = markerKind(lines[i]);
    if (!k) continue;
    const { text, next } = gatherBlock(lines, i + 1);
    if (text) out.push({ category: classify(k.num, isLegacy3), heading: lines[i].trim(), chars: countChars(text) });
    i = next - 1;
  }
  return out;
}

function classify(num, isLegacy3) {
  if (num === 'yosou') return 'yosou';
  if (num === '1') return isLegacy3 ? 'legacy3_q1' : 'current2_q1';
  if (num === '2') return isLegacy3 ? 'legacy3_q2' : 'current2_q2';
  if (num === '3') return 'legacy3_q3';
  return 'unknown';
}

// --- 実行 --------------------------------------------------------------------
const report = [];
let overCount = 0;
let totalParas = 0;

for (const f of files) {
  const body = stripFrontmatter(readFileSync(f, 'utf-8'));
  const answers = extractAnswers(body);
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const rows = answers.map((a) => {
    const lim = LIMITS[a.category];
    const max = lim ? lim.maxChars : null;
    const over = max != null && a.chars > max;
    if (over) overCount++;
    totalParas++;
    return { ...a, max, over };
  });
  report.push({ file: rel, rows });
}

if (asJson) {
  console.log(JSON.stringify({ provisional: PROVISIONAL, overCount, totalParas, files: report }, null, 2));
} else {
  for (const r of report) {
    const short = r.file.replace(/^docs\/note\//, '').replace('/article.md', '');
    console.log(`\n■ ${short}`);
    if (r.rows.length === 0) {
      console.log('   (答案段落を検出できず — 見出し形式を確認)');
      continue;
    }
    for (const row of r.rows) {
      const flag = row.over ? `OVER (上限${row.max})` : row.max != null ? `ok  (上限${row.max})` : 'cat? ';
      const mark = row.over ? '×' : '○';
      console.log(`   ${mark} [${row.category.padEnd(12)}] ${String(row.chars).padStart(3)}字 ${flag}  ${row.heading.slice(0, 34)}`);
    }
  }
  console.log(`\n--- 合計 ${totalParas} 段落 / OVER ${overCount} 件${PROVISIONAL ? '（しきい値は暫定。公式解答欄行数で要確定）' : ''} ---`);
}

if (strict && overCount > 0) process.exit(1);
