#!/usr/bin/env node
// note-essay-charcount.mjs
// note マガジン模範論文（content/note/magazines/**/article.md）の答案を設問別・組合せ別に
// 分割し、答案用紙の枚数上限に対する適合を判定する。
//
// 使い方:
//   node .claude/scripts/note-essay-charcount.mjs <article.md> [<article.md> ...]
//   node .claude/scripts/note-essay-charcount.mjs            # 模範論文系マガジンを全走査
//
// 答案用紙の上限は年度（試験回）ごとに異なる。例: R03 は設問(1)=2枚・設問(3)=1枚、
// R07 は設問(1)=1枚・設問(2)(3)=各組合せ1枚。このためスクリプトは上限を固定せず、
// 試験問題セクションの設問見出し `### 設問（N）…（…答案用紙X枚以内）` から抽出する。
//   - 「答案用紙X枚以内」      → 設問合計 = X×600 字（組合せ別の内訳上限なし）
//   - 「各組合せ／各方法を答案用紙X枚以内」 → 組合せごと X×600 字 / 設問合計 = 組合せ数×X×600
// 抽出できない記事（R8 予想問題集など、問題文に枚数記載がないもの）は直近の
// 標準形式（設問1=1枚 / 設問2=各組合せ1枚 / 設問3=各組合せ1枚）を仮定し、その旨を注記する。
// 設問(3) は現行の模範論文構造が組合せ単位に分かれないため、設問合計のみ判定する。
//
// 対応する見出し構造（自動判定）:
//   - 答案を `## 設問（N）` / `## A 案 設問（N）` で書く（既存の模範論文マガジン）
//   - 答案を `### 設問（N）` で書く（フル模範論文を H2 ブロック配下に持つ R8 予想問題集）
//   組合せの区切りは見出し型（`**施策 1:` / `### 方法 1：`）・散文型（`施策 1 は、`）・
//   序数型（`第一の施策は、`）の 3 形式、ラベルは「施策」「方法」の両方を検出する。
//
// 字数カウント: 原稿用紙マス数を推定する。全角文字 = 1 マス、半角英数字 = 2 字で
//   1 マス。マークアップ（`**`・箇条書き記号・見出し行・表罫線・画像・リンク URL）は
//   答案本文ではないため除外する。
//
// 出力: 記事ごとに設問別・組合せ別の「マス数 / 上限」と判定（OK / WARN=上限の97%以上 /
//   NG=超過）を表示。上限超過が 1 件でもあれば終了コード 1、全件適合なら 0。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

const SHEET = 600; // 答案用紙 1 枚 = 600 字
const WARN_RATIO = 0.97; // 上限の 97% 以上で WARN（余白が僅少）

// 直近の標準形式（問題文に枚数記載がない記事のフォールバック）
const STANDARD = {
  1: { pages: 1, perKumiawase: false },
  2: { pages: 1, perKumiawase: true },
  3: { pages: 1, perKumiawase: true },
};

// 組合せ（施策／方法／戦略）の区切り行。見出し型・散文型・序数型に対応。
const KUMIAWASE_HEAD =
  /^(#{1,4}\s*|\*\*)?((施策|方法|戦略)\s*[0-9０-９]|第[一二三四五六七八九]の(施策|方法|戦略))/;

/** 全角数字を半角へ */
const toHankaku = (s) => s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

/** 数値文字列（半角・全角・漢数字）を整数へ */
function parseNum(s) {
  const kanji = '〇一二三四五六七八九';
  if (kanji.includes(s) && s.length === 1) return kanji.indexOf(s);
  return parseInt(toHankaku(s), 10);
}

/** 原稿用紙マス数を推定（全角=1 マス、半角=2 字で 1 マス、装飾は除外） */
function countSquares(text) {
  const t = text
    .split('\n')
    .filter((l) => !/^#{1,6}\s/.test(l)) // 見出し行を除外
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 画像
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // リンクは表示テキストのみ
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*]\s+/gm, '') // 箇条書きマーカー
    .replace(/^\s*>\s?/gm, '') // 引用
    .replace(/\|/g, '') // 表罫線
    .replace(/[\s　]/g, ''); // 空白（半角・全角）
  let full = 0;
  let half = 0;
  for (const ch of t) {
    const code = ch.codePointAt(0);
    if (code <= 0xff || (code >= 0xff61 && code <= 0xff9f)) half++;
    else full++;
  }
  return full + Math.ceil(half / 2);
}

/** 判定（OK / WARN / NG） */
function judge(squares, cap) {
  if (squares > cap) return 'NG';
  if (squares >= cap * WARN_RATIO) return 'WARN';
  return 'OK';
}

/** 組合せ（施策／方法）ブロックへ分割。2 つ未満しか検出できなければ null */
function splitKumiawase(sectionText) {
  const lines = sectionText.split('\n');
  const heads = [];
  lines.forEach((l, i) => {
    if (KUMIAWASE_HEAD.test(l)) heads.push(i);
  });
  if (heads.length < 2) return null;
  return heads.map((h, k) => lines.slice(h, heads[k + 1] ?? lines.length).join('\n'));
}

/** 試験問題セクションの設問見出しから答案用紙の上限を抽出 */
function extractSheetSpec(raw) {
  const spec = {};
  for (const m of raw.matchAll(
    /^###\s+設問（([０-９0-9]+)）[^\n]*?（([^（）]*答案用紙[^（）]*)）/gm
  )) {
    const num = toHankaku(m[1]);
    const phrase = m[2];
    const pm = phrase.match(/答案用紙\s*([0-9０-９一二三四五六七八九]+)\s*枚/);
    if (!pm) continue;
    // 組合せ別の上限か（「各組合せ／各方法を…X枚」「3戦略それぞれを…X枚」）
    const perKumiawase = /各|それぞれ/.test(phrase);
    // 「3戦略」のように組合せ数が明示される場合は抽出（無ければ答案から数える）
    const cm = phrase.match(/([0-9０-９一二三四五六七八九]+)\s*(戦略|組合せ|施策|方法)/);
    spec[num] = {
      pages: parseNum(pm[1]),
      perKumiawase,
      explicitCount: cm ? parseNum(cm[1]) : null,
      phrase,
    };
  }
  return spec;
}

/** 答案の設問見出しを検出（問題文の `### 設問` は巻き込まない。下記コメント参照） */
function findQuestionHeads(lines) {
  // 模範論文マガジンは答案を `## 設問（N）`（H2）、R8 予想問題集は `### 設問（N）`（H3）で書く。
  // 「`## 設問` が 1 つでもあれば答案は H2、無ければ H3」と判定すれば、模範論文マガジンの
  // 試験問題セクションにある `### 設問`（問題文）を答案として誤検出しない。
  const hasH2Q = lines.some((l) => /^##\s+(?:[ＡＢAB]\s*案\s+)?設問（/.test(l));
  const level = hasH2Q ? 2 : 3;
  const re = new RegExp(`^#{${level}}\\s+(?:([ＡＢAB])\\s*案\\s+)?設問（([０-９0-9]+)）`);
  const heads = [];
  lines.forEach((l, i) => {
    const m = l.match(re);
    if (m) heads.push({ line: i, level, an: m[1] || '', num: toHankaku(m[2]) });
  });
  return heads;
}

/** 設問見出し行以降、自身と同レベル以下の見出しが現れる直前までを内容とする */
function questionContentEnd(lines, headLine, level) {
  for (let i = headLine + 1; i < lines.length; i++) {
    const hm = lines[i].match(/^(#{1,6})\s/);
    if (hm && hm[1].length <= level) return i;
  }
  return lines.length;
}

/** 1 記事を解析 */
function analyze(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');

  const heads = findQuestionHeads(lines);
  if (heads.length === 0) return { file, skip: true };

  const sheetSpec = extractSheetSpec(raw);
  const usedFallback = Object.keys(sheetSpec).length === 0;

  const checks = [];
  heads.forEach((h, k) => {
    const end =
      k + 1 < heads.length
        ? Math.min(heads[k + 1].line, questionContentEnd(lines, h.line, h.level))
        : questionContentEnd(lines, h.line, h.level);
    const body = lines.slice(h.line + 1, end).join('\n');
    const prefix = h.an ? `${h.an} 案 ` : '';
    const total = countSquares(body);
    const spec = sheetSpec[h.num] || STANDARD[h.num] || STANDARD[1];
    const kumiawase = splitKumiawase(body);
    // 組合せ数: 問題文の明示数 → 答案の組合せ見出し数 → 標準の 2、の優先で決定
    const n = spec.explicitCount || (kumiawase ? kumiawase.length : 2);

    if (h.num === '2') {
      if (spec.perKumiawase) {
        const each = spec.pages * SHEET;
        if (kumiawase) {
          kumiawase.forEach((blk, i) =>
            checks.push({ label: `${prefix}設問（2）組合せ${i + 1}`, squares: countSquares(blk), cap: each })
          );
        }
        checks.push({ label: `${prefix}設問（2）計`, squares: total, cap: n * each });
      } else {
        checks.push({ label: `${prefix}設問（2）計`, squares: total, cap: spec.pages * SHEET });
      }
    } else if (h.num === '3') {
      const cap = spec.perKumiawase ? n * spec.pages * SHEET : spec.pages * SHEET;
      checks.push({ label: `${prefix}設問（3）計`, squares: total, cap });
    } else {
      const cap = spec.perKumiawase ? n * spec.pages * SHEET : spec.pages * SHEET;
      checks.push({ label: `${prefix}設問（${h.num}）計`, squares: total, cap });
    }
  });

  for (const c of checks) c.status = judge(c.squares, c.cap);
  return { file, checks, usedFallback, hasNG: checks.some((c) => c.status === 'NG') };
}

/** ディレクトリを再帰走査して article.md を集める */
function walkArticles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'img') out.push(...walkArticles(p));
    else if (e.isFile() && e.name === 'article.md') out.push(p);
  }
  return out;
}

/** 対象ファイル一覧（引数はファイルでもディレクトリでも可） */
function targets(args) {
  if (args.length) {
    const out = [];
    for (const a of args) {
      const abs = path.resolve(a);
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) out.push(...walkArticles(abs));
      else out.push(abs);
    }
    return out.sort();
  }
  // 引数省略時: 模範論文系マガジン（模範論文 + R8予想問題集）の article.md。
  // 精読ガイド等の非・論文マガジンは対象外。
  // -c core.quotepath=false は必須。対象パスが丸ごと日本語なので、無いと git が
  // 8 進エスケープした名前を返し、全件が「ファイルなし」になって 1 本も検証しない
  // （2026-08-30 実測。それでも exit 0 で終わっていた）。
  const out = execSync(
    'git -c core.quotepath=false ls-files "content/note/技術士総監/magazines/総監模範論文-*/*/article.md" "content/note/技術士総監/magazines/総監記述式-*/*/article.md"',
    { cwd: ROOT, encoding: 'utf8' }
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((f) => path.join(ROOT, f));
}

function main() {
  const files = targets(process.argv.slice(2));
  if (!files.length) {
    console.log('対象記事なし。');
    process.exit(0);
  }
  console.log('答案用紙 字数検証（原稿用紙マス数推定: 全角=1マス・半角英数=2字で1マス）');
  console.log('上限は試験問題の「答案用紙X枚以内」から抽出。記載なき記事は標準形式を仮定。\n');

  let articleCount = 0;
  let ngCount = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(file)) {
      console.log(`${rel}\n  ファイルなし\n`);
      continue;
    }
    const r = analyze(file);
    if (r.skip) continue; // 設問構造を持たない記事（序章等）
    articleCount++;
    console.log(rel + (r.usedFallback ? '  ※枚数記載なし・標準形式を仮定' : ''));
    for (const c of r.checks) {
      const mark = c.status === 'NG' ? 'NG  ' : c.status === 'WARN' ? 'WARN' : 'OK  ';
      console.log(`  ${mark} ${c.label.padEnd(18)} ${String(c.squares).padStart(5)} / ${c.cap}`);
    }
    if (r.hasNG) ngCount++;
    console.log('');
  }

  if (articleCount === 0) {
    console.log('設問構造を持つ記事が見つかりませんでした。');
    process.exit(0);
  }
  console.log('─'.repeat(52));
  if (ngCount === 0) {
    console.log(`適合: ${articleCount} 記事すべてが答案用紙の上限内です。`);
    process.exit(0);
  }
  console.log(`上限超過: ${articleCount} 記事中 ${ngCount} 記事に NG（上記 NG 行を参照）。`);
  process.exit(1);
}

main();
