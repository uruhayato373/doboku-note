#!/usr/bin/env node
// note-essay-charcount.mjs
// note マガジン模範論文（docs/note/magazines/**/article.md）の答案を設問別に
// 分割し、解答字数を測定する。答案用紙の枚数制限への充足率判定のための入力。
//
// 使い方:
//   node .claude/scripts/note-essay-charcount.mjs <article.md> [<article.md> ...]
//   node .claude/scripts/note-essay-charcount.mjs            # 模範論文マガジンを全走査
//
// 仕様:
//   - 答案領域 = 最初の H2「## 設問（」（または「## A 案 設問（」等）から
//     「## 採点者視点」直前まで（無ければ末尾まで）。
//   - 設問別字数 = H2「## 設問（N）」（A 案／B 案併記の論文は「## A 案 設問（N）」）で
//     分割した各ブロックの文字数。
//     見出し行（# 始まり）を除外し、** ・ 行頭「- 」・[表示](URL)→表示 を
//     除去し、空白を除いた文字数。markdown 装飾を含むため実答案よりやや多め。
//   - 答案用紙の枚数上限は、試験問題セクションの見出し
//     「### 設問（N）…（…答案用紙X枚以内）」から括弧内の文言を抽出して併記する。
//     組合せ・施策の個数による倍率（例「各組合せを答案用紙1枚以内」×2＝1200字）は
//     スクリプトでは判定せず、スキル実行側が設問チェックリストで判断する。
//
// 出力: 記事ごとに設問別字数・上限文言・合計を表示。複数記事指定時はまとめて表示。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

/** 答案本文の文字数（markdown 装飾・見出し行を除外、空白を除く） */
function answerLen(text) {
  return text
    .split('\n')
    .filter((l) => !/^#{1,6}\s/.test(l))
    .join('')
    .replace(/\*\*/g, '')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s/g, '').length;
}

/** 1 記事を解析して設問別字数を返す */
function analyze(file) {
  const raw = fs.readFileSync(file, 'utf8');

  // 試験問題セクションの設問見出しから答案用紙制限の文言を抽出
  const limits = {};
  for (const m of raw.matchAll(
    /^### 設問（([０-９0-9]+)）[^\n]*?（([^（）]*答案用紙[^（）]*)）/gm
  )) {
    limits[m[1]] = m[2];
  }

  // 答案領域の特定（A 案／B 案併記の論文は「## A 案 設問（」等も対象）
  const startM = raw.match(/\n## (?:[ＡＢAB] 案 )?設問（/);
  if (!startM) return { file, error: '答案領域（H2「## 設問（」）が見つからない' };
  const tail = raw.slice(startM.index + 1);
  const endM = tail.match(/\n## 採点者視点/);
  const region = endM ? tail.slice(0, endM.index) : tail;

  // すべての H2 で分割し、設問見出しのチャンクだけを採用する。
  // A 案／B 案併記論文では設問の間に「## B 案: …（前提条件）」等の非設問 H2 が
  // 挟まるため、設問見出しだけで分割すると次設問までの非設問ブロックを巻き込む。
  const chunks = region.split(/\n(?=## )/);
  const rows = [];
  for (const c of chunks) {
    const h = c.match(/^## ([ＡＢAB] 案 )?設問（([０-９0-9]+)）/);
    if (!h) continue;
    const prefix = h[1] ? h[1].trim() + ' ' : '';
    rows.push({ label: `${prefix}設問（${h[2]}）`, len: answerLen(c), limit: limits[h[2]] || '' });
  }
  return { file, rows, total: rows.reduce((a, r) => a + r.len, 0) };
}

/** 対象ファイル一覧の決定 */
function targets(args) {
  if (args.length) return args.map((a) => path.resolve(a));
  // 引数省略時: git 管理下の模範論文マガジン記事を対象（精読ガイド等は除く）
  const out = execSync(
    'git ls-files "docs/note/magazines/総監模範論文-*/*/article.md"',
    { cwd: ROOT, encoding: 'utf8' }
  );
  return out.split('\n').filter(Boolean).map((f) => path.join(ROOT, f));
}

function main() {
  const files = targets(process.argv.slice(2));
  if (!files.length) {
    console.log('対象記事なし。');
    return;
  }
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(file)) {
      console.log(`${rel}\n  ファイルなし\n`);
      continue;
    }
    const r = analyze(file);
    if (r.error) {
      console.log(`${rel}\n  ${r.error}\n`);
      continue;
    }
    console.log(rel);
    for (const row of r.rows) {
      const limitNote = row.limit ? `  上限: ${row.limit}` : '  上限: 不明（試験問題セクション未掲載）';
      console.log(`  ${row.label}: ${String(row.len).padStart(5)} 字${limitNote}`);
    }
    console.log(`  合計: ${r.total} 字\n`);
  }
  console.log(
    '※字数は markdown 装飾を含むプロキシ値（実答案よりやや多め）。' +
      '答案用紙1枚＝600字。健全帯は枚数上限の 85〜105%。'
  );
}

main();
