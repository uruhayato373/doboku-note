#!/usr/bin/env node
/**
 * 7-2 違反（太字デリミタ境界）の一括自動修正
 *
 * パターン: `**X（Y）**Z` （Z は日本語助詞/漢字）→ `**X**（Y）Z`
 *
 * 修正方針: 閉じ `**` の直前が全角パンクチュエーション、直後が非パンクチュエーション
 * 日本語の場合、太字レンジをパンクチュエーション前で閉じ、括弧等はプレーン文として出す。
 *
 * 安全性:
 * - 元の改行コード（CRLF/LF）を保持（mdx-io.mjs 経由）
 * - 改変対象は `**...**` の内部構造のみ。リンクやコード塊は影響しない（行内 `*` を含まないパターン前提）
 * - dry-run モード対応
 *
 * Usage:
 *   node .claude/scripts/fix-bold-delimiter-boundary.mjs --dry-run content/site
 *   node .claude/scripts/fix-bold-delimiter-boundary.mjs --apply content/site
 */

import { readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const CLOSING_PUNCT_SET = '）」』】〕］｝〉》、。・：；！？';
const NON_PUNCT_JP_RE = /[ぁ-んァ-ン一-龥々ー]/;

function collectMdx(root, out = []) {
  if (!statSync(root).isDirectory()) {
    if (root.endsWith('.mdx')) out.push(root);
    return out;
  }
  for (const entry of readdirSync(root)) {
    const p = join(root, entry);
    const st = statSync(p);
    if (st.isDirectory()) collectMdx(p, out);
    else if (entry.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/**
 * 一行単位で修正を試みる。複数の `**` ペアを順に処理。
 * 行内の `**` 位置を先頭から 2 つずつペアリングし、各ペアで境界違反があれば
 * 閉じ `**` の直前 1 文字（全角パンクチュエーション）を太字外に出す形に書き換え。
 *
 * @param {string} line
 * @returns {{ line: string, fixed: number }}
 */
function fixLine(line) {
  if (!line.includes('**')) return { line, fixed: 0 };

  // `**` 位置を収集
  const positions = [];
  let idx = 0;
  while ((idx = line.indexOf('**', idx)) !== -1) {
    positions.push(idx);
    idx += 2;
  }

  // ペアごとに違反判定＆書き換え対象を決定
  const rewrites = []; // { openIdx, closeIdx, punct }
  for (let p = 0; p + 1 < positions.length; p += 2) {
    const openIdx = positions[p];
    const closeIdx = positions[p + 1];
    const charBefore = line[closeIdx - 1];
    const charAfter = line[closeIdx + 2];
    if (
      charBefore &&
      charAfter &&
      CLOSING_PUNCT_SET.includes(charBefore) &&
      NON_PUNCT_JP_RE.test(charAfter)
    ) {
      // 太字内部に `*` がないこと（念のため）
      const inner = line.slice(openIdx + 2, closeIdx);
      if (inner.includes('*')) continue;
      rewrites.push({ openIdx, closeIdx, punctLen: 1 });
    }
  }

  if (rewrites.length === 0) return { line, fixed: 0 };

  // 逆順に書き換え（index ズレ防止）
  let out = line;
  for (const r of rewrites.slice().reverse()) {
    // `**X（Y）**` → `**X**（Y）`
    // 具体: 閉じ `**` 直前の全角括弧類を含む部分を、太字閉じの後ろへ移す。
    // 単純には「閉じ `**` の直前」から openIdx 方向に「対応する開き括弧」を探し、
    // それ以降を太字の外に出す。
    const close = r.closeIdx;
    const open = r.openIdx;
    // 対応する開き全角括弧を探索（`（「『【〔［｛〈《`）
    const OPEN_PUNCT = '（「『【〔［｛〈《';
    // close - 1 の文字は閉じパンクチュエーション。それを含む直近のパンクチュエーション群を探す
    // シンプル戦略: close - 1 から逆走して、対応する open punct か、パンクチュエーションでない文字に達するまで
    const innerStart = open + 2;
    const innerText = line.slice(innerStart, close);
    // 最後の開き全角括弧の位置を探す（close 側から見て最も近いもの）
    let parenOpenInInner = -1;
    for (let i = innerText.length - 1; i >= 0; i--) {
      if (OPEN_PUNCT.includes(innerText[i])) {
        parenOpenInInner = i;
        break;
      }
    }

    let before; // `**` と閉じ `**` の間で太字として残す部分
    let after; // 太字の外に出す部分（括弧含む）
    let prefix = ''; // 太字の前に出す部分（`**「X」**` を `「**X**」` にするケース）

    // 括弧対応表
    const PAIR = { '（': '）', '「': '」', '『': '』', '【': '】', '〔': '〕', '［': '］', '｛': '｝', '〈': '〉', '《': '》' };

    if (parenOpenInInner >= 0) {
      if (parenOpenInInner === 0) {
        // 先頭が開き括弧（例: `**「働き方改革」**と`）
        const openChar = innerText[0];
        const closeChar = PAIR[openChar];
        if (closeChar && innerText.endsWith(closeChar)) {
          // `**「X」**Y` → `「**X**」Y`
          prefix = openChar;
          before = innerText.slice(1, -1);
          after = closeChar;
        } else {
          // 末尾と不整合: スキップ
          continue;
        }
      } else {
        // `**主題（副題）**X` → `**主題**（副題）X`
        before = innerText.slice(0, parenOpenInInner);
        after = innerText.slice(parenOpenInInner);
      }
    } else {
      // 対応する開き括弧がないケース（句点のみ等）: 末尾パンクチュエーションだけ外に出す
      before = innerText.slice(0, -1);
      after = innerText.slice(-1);
    }

    // 太字が空になるケース（例: `**（Y）**Z`）は修正しない
    if (before.length === 0) continue;

    out =
      out.slice(0, open) +
      prefix +
      '**' +
      before +
      '**' +
      after +
      out.slice(close + 2);
  }

  return { line: out, fixed: rewrites.length };
}

function processFile(path, apply) {
  const { raw, eol } = readMdxFile(path);
  const lines = raw.split(/\r\n|\n/);
  let totalFixed = 0;
  const newLines = lines.map((l) => {
    const r = fixLine(l);
    totalFixed += r.fixed;
    return r.line;
  });

  if (totalFixed === 0) return { path, fixed: 0 };

  if (apply) {
    const newRaw = newLines.join(eol === '\r\n' ? '\r\n' : '\n');
    writeMdxFile(path, newRaw, eol);
  }

  return { path, fixed: totalFixed };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dry = args.includes('--dry-run') || !apply;
  const targets = args.filter((a) => !a.startsWith('--'));

  if (targets.length === 0) {
    console.error(
      'Usage: node fix-bold-delimiter-boundary.mjs [--dry-run|--apply] <path...>'
    );
    process.exit(2);
  }

  const files = [];
  for (const t of targets) collectMdx(resolve(t), files);

  let totalFiles = 0;
  let totalFixed = 0;
  for (const f of files) {
    const r = processFile(f, apply);
    if (r.fixed > 0) {
      totalFiles++;
      totalFixed += r.fixed;
      console.log(`${apply ? '[fixed]' : '[dry]'} ${r.path}: ${r.fixed}`);
    }
  }

  console.log('');
  console.log(`Files affected: ${totalFiles}`);
  console.log(`Total fixes: ${totalFixed}`);
  if (dry && !apply) console.log('(dry-run: no files modified. Use --apply to write)');
}

main();
