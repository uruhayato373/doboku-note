#!/usr/bin/env node
// 構造だけを変えた編集（表→箇条書き・長文の分割・入れ子の平坦化）で、数値と「」『』の語が消えていないかを確かめる。
//
// 2026-10-06 のセッションで、モバイル整形（lint-mdx-mobile 1-4・15-x）の各編集を、親とサブエージェントが
// それぞれ使い捨てのスクリプトで旧本文と照合していた。照合の物差しをここに固定する。
//
//   node scripts/check-mdx-facts.mjs <file...> [--base <rev>]   # 既定の比較元は HEAD（＝未 commit の編集を見る）
//   npm run check-mdx-facts -- content/site/x/article.mdx --base HEAD~1
//
// 比べるもの（NFKC で正規化し、全角・半角の数字は同じとみなす）:
//   - 数値（123・1.5・2,000）の出現回数
//   - 「」『』で括った語の出現回数（計画名・法令名・引用の取りこぼしを拾う）
// 減ったものがあれば exit 1。増えたもの（補った接続語・見出し語の繰り返し）は表示だけ。
// 減ったものが説明できる（表の行番号を落とした等）なら、その説明を commit に書いて進めてよい。
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// frontmatter は比べない（dateModified は pre-commit が進める・title 等は本文の構造変更と関係しない）
const body = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const norm = (s) => body(s).normalize('NFKC').replace(/<br\s*\/?>/g, ' ');

/** @returns {Map<string, number>} */
function counts(items) {
  const m = new Map();
  for (const x of items) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}

export function factTokens(text) {
  const t = norm(text);
  return {
    numbers: counts(t.match(/\d+(?:[.,]\d+)*/g) ?? []),
    quoted: counts([...t.matchAll(/[「『]([^「」『』\n]{1,80})[」』]/g)].map((m) => m[1])),
  };
}

/** 旧 → 新で減った・増えたトークン */
export function compareFacts(oldText, newText) {
  const a = factTokens(oldText);
  const b = factTokens(newText);
  const changed = (x, y, fewer) =>
    [...new Set([...x.keys(), ...y.keys()])]
      .map((k) => ({ token: k, before: x.get(k) ?? 0, after: y.get(k) ?? 0 }))
      .filter((d) => (fewer ? d.after < d.before : d.after > d.before));
  return {
    lostNumbers: changed(a.numbers, b.numbers, true),
    lostQuoted: changed(a.quoted, b.quoted, true),
    gainedNumbers: changed(a.numbers, b.numbers, false),
    gainedQuoted: changed(a.quoted, b.quoted, false),
  };
}

function main() {
  const args = process.argv.slice(2);
  const bi = args.indexOf('--base');
  const base = bi >= 0 ? args[bi + 1] : 'HEAD';
  const files = args.filter((a, i) => !a.startsWith('--') && (bi < 0 || (i !== bi && i !== bi + 1)));
  if (files.length === 0) {
    console.error('usage: node scripts/check-mdx-facts.mjs <file...> [--base <rev>]');
    process.exit(2);
  }
  let checked = 0;
  let failed = 0;
  let skipped = 0;
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`[check-mdx-facts] ${file}: ファイルが無い`);
      skipped++;
      continue;
    }
    let before;
    try {
      before = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch {
      console.error(`[check-mdx-facts] ${file}: ${base} に無い（新規ファイルは比べられない）`);
      skipped++;
      continue;
    }
    checked++;
    const r = compareFacts(before, readFileSync(file, 'utf8'));
    const fmt = (xs) => xs.map((x) => `${x.token}（${x.before}→${x.after}）`).join('、');
    const lost = r.lostNumbers.length + r.lostQuoted.length;
    if (lost > 0) failed++;
    console.log(`${lost > 0 ? '✗' : '✓'} ${file}`);
    if (r.lostNumbers.length) console.log(`  減った数値: ${fmt(r.lostNumbers)}`);
    if (r.lostQuoted.length) console.log(`  減った「」の語: ${fmt(r.lostQuoted)}`);
    if (r.gainedNumbers.length) console.log(`  増えた数値: ${fmt(r.gainedNumbers)}`);
    if (r.gainedQuoted.length) console.log(`  増えた「」の語: ${fmt(r.gainedQuoted)}`);
  }
  console.log(`[check-mdx-facts] 対象 ${files.length} 件 / 実検査 ${checked} 件 / 減少あり ${failed} 件 / 比較不能 ${skipped} 件（比較元 ${base}）`);
  if (checked === 0) process.exit(2);
  process.exitCode = failed > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
