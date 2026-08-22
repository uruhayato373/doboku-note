#!/usr/bin/env node
// 施工経験記述（1級・2級土木 第2次検定 問題1）の答案段落を解答欄しきい値で機械チェックする。
// 決定論的処理（CLAUDE.md 原則5）。判定は Evaluator(civil-keiken-essay-qa)、修正は Generator(civil-keiken-essay-writer)。
//
// 使い方:
//   node scripts/keiken-charcount.mjs [path ...] [--json] [--strict] [--min-fill] [--staged]
//     path 省略時: content/note/1級・2級土木/{1級,2級}土木/magazines 配下の「経験記述」or「想定工事バンク」を含む article.md を全走査
//     --json   : 機械可読 JSON を出力（Evaluator 連携用）
//     --strict : OVER が1件でもあれば exit 1（ゲート用途）
//     --min-fill: 級別SSOTの minimum_fill_ratio 未満も exit 1 の対象にする（公開品質ゲート）
//     --staged : git staged の keiken 記事だけ検査（pre-commit 用・関連なしは即 exit 0）
//
// しきい値の真実源: .claude/config/keiken-answer-sheet-limits.json（公式行数確定までは暫定）

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, '.claude/config/keiken-answer-sheet-limits.json');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const enforceMinFill = args.includes('--min-fill');
const stagedMode = args.includes('--staged'); // pre-commit 用: git staged の keiken 記事だけ検査
const inputs = args.filter((a) => !a.startsWith('--'));

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
const GRADES = config.grades || {};
const DEFAULT_GRADE = (config._meta && config._meta.default_grade) || 'civil-1';
const TOL = (config._meta && config._meta.borderline_tolerance) || 0; // +10% は1行字数の幅で収まる帯
const SEVERE = 1.3; // ×1.3 超は解答欄に物理的に収まらない

// パスから級を判定（/2級土木/ → civil-2、/1級土木/ → civil-1、不明 → default）
// スラッシュ区切りで判定する（"1級・2級土木" が "2級土木" を部分文字列に含むため、
// bare substring だと 1級・2級土木 配下の 1級記事を civil-2 に誤判定する。2026-06-12 dir 統合）
function gradeOf(filePath) {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/2級土木/')) return 'civil-2';
  if (p.includes('/1級土木/')) return 'civil-1';
  return DEFAULT_GRADE;
}
function limitsFor(grade) {
  return (GRADES[grade] && GRADES[grade].limits) || {};
}

// severity: ok / borderline(≤+tol) / over(要圧縮) / severe(×1.3超)
function severity(chars, max) {
  if (max == null) return 'nocat';
  if (chars <= max) return 'ok';
  if (chars <= Math.round(max * (1 + TOL))) return 'borderline';
  if (chars <= Math.round(max * SEVERE)) return 'over';
  return 'severe';
}

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
  for (const base of ['content/note/1級・2級土木/1級土木/magazines', 'content/note/1級・2級土木/2級土木/magazines']) {
    const abs = join(ROOT, base);
    if (existsSync(abs)) walk(abs, acc);
  }
  // keiken マガジン種別に限定（完成答案集/過去問/予想＝「経験記述」・工事バンク＝「想定工事バンク」）。
  // 新しい keiken マガジン名を足したらここに追加する。漏れは check-magazine-wiring.mjs が機械検知する。
  return acc.filter((p) => p.includes('経験記述') || p.includes('想定工事バンク'));
}

// staged の keiken 記事だけを対象にする（pre-commit ゲート用）
function isKeikenArticle(p) {
  const s = p.replace(/\\/g, '/');
  return /content\/note\/1級・2級土木\/[12]級土木\/magazines\//.test(s)
    && (s.includes('経験記述') || s.includes('想定工事バンク'))
    && s.endsWith('article.md');
}
function stagedKeikenTargets() {
  let out = '';
  try { out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }); }
  catch { return []; }
  return out.split('\n').map((x) => x.trim())
    .filter((x) => x && isKeikenArticle(x) && existsSync(join(ROOT, x)))
    .map((x) => join(ROOT, x));
}

let files = [];
if (stagedMode) {
  files = stagedKeikenTargets();
  if (files.length === 0) process.exit(0); // staged に keiken 記事なし → ゲート通過
} else if (inputs.length === 0) {
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

// 答案直後に置かれる読者向け注釈ラベル（行頭の太字ラベル）。例: **安全と品質のどちらを選ぶか**：…
// これは受験者が解答欄に書く本文ではないため字数に含めない。**(数) 設問マーカーは別途 markerKind が処理。
function isLabelNote(s) {
  return s.startsWith('**') && /^\*\*[^*]+\*\*[：:]/.test(s);
}

// マーカー直後から「次のマーカー / 次の見出し(#) / 太字注釈ラベル」までを答案ブロックとして収集。
// リスト記号は除去して中身は算入、blockquote(>)編集注記・hr(---)は除外。
function gatherBlock(lines, start) {
  let j = start;
  const buf = [];
  while (j < lines.length && lines[j].trim() === '') j++;
  while (j < lines.length) {
    const raw = lines[j];
    const s = raw.trim();
    if (markerKind(raw) || s.startsWith('#') || isLabelNote(s)) break; // 次の設問 / 次セクション / 注釈ラベル
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
const tally = { ok: 0, borderline: 0, over: 0, severe: 0, nocat: 0, underMin: 0 };
let totalParas = 0;
let gateFails = 0; // borderline 超（over+severe）= 要圧縮

const gradesSeen = new Set();
for (const f of files) {
  const body = stripFrontmatter(readFileSync(f, 'utf-8'));
  const answers = extractAnswers(body);
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const grade = gradeOf(f);
  gradesSeen.add(grade);
  const LIMITS = limitsFor(grade);
  const rows = answers.map((a) => {
    const lim = LIMITS[a.category];
    const max = lim ? lim.maxChars : null;
    const ratio = GRADES[grade] && GRADES[grade].minimum_fill_ratio;
    const min = enforceMinFill && max != null && ratio ? Math.ceil(max * ratio) : null;
    const underMin = min != null && a.chars < min;
    const sev = severity(a.chars, max);
    tally[sev]++;
    if (underMin) tally.underMin++;
    totalParas++;
    if (sev === 'over' || sev === 'severe' || underMin) gateFails++;
    return { ...a, min, max, underMin, severity: sev };
  });
  report.push({ file: rel, grade, rows });
}

const MARK = { ok: '○', borderline: '△', over: '×', severe: '✗', nocat: '?' };
const LABEL = { ok: 'ok', borderline: 'borderline', over: '要圧縮', severe: '大幅超過', nocat: 'cat?' };

if (asJson) {
  console.log(JSON.stringify({ tolerance: TOL, grades: [...gradesSeen], tally, gateFails, totalParas, files: report }, null, 2));
} else {
  for (const r of report) {
    const short = r.file.replace(/^content\/note\//, '').replace('/article.md', '');
    const cpl = (GRADES[r.grade] && GRADES[r.grade].char_per_line) || '?';
    console.log(`\n■ ${short}  [${r.grade}/${cpl}字per行]`);
    if (r.rows.length === 0) {
      console.log('   (答案段落を検出できず — 見出し形式を確認)');
      continue;
    }
    for (const row of r.rows) {
      const tag = row.underMin
        ? `短い(下限${row.min})`
        : row.max != null ? `${LABEL[row.severity]}(上限${row.max})` : 'cat?';
      const mark = row.underMin ? '▽' : MARK[row.severity];
      console.log(`   ${mark} [${row.category.padEnd(12)}] ${String(row.chars).padStart(3)}字 ${tag.padEnd(16)} ${row.heading.slice(0, 32)}`);
    }
  }
  console.log(
    `\n--- 合計 ${totalParas} 段落 / ○ok ${tally.ok} / △borderline ${tally.borderline} / ×要圧縮 ${tally.over} / ✗大幅 ${tally.severe}` +
      `${enforceMinFill ? ` / ▽短い ${tally.underMin}` : ''} （級別しきい値: ${[...gradesSeen].join(',')}） ---`
  );
}

// borderline は28字/行なら収まり得るため通過。要圧縮(over)以上で fail。
if (strict && gateFails > 0) process.exit(1);
