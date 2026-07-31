#!/usr/bin/env node
/**
 * SVG カラー監査スクリプト
 *
 * .local/r2/posts/** 配下の SVG を走査し、セマンティックパレット適合率を計測。
 * 真実源: src/styles/globals.css の --color-* / .claude/skills/content/create-svg/SKILL.md
 *
 * Usage:
 *   node scripts/audit-svg-colors.mjs                # サマリ
 *   node scripts/audit-svg-colors.mjs --verbose      # 各ファイルの非適合色も表示
 *   node scripts/audit-svg-colors.mjs --top=20       # 最もズレているファイル top N
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

// URL#pathname は Windows で '/C:/...' を返し、join() が 'C:\C:\...' を作る。
// fileURLToPath でプラットフォーム固有の絶対パスへ変換する。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGET_DIR = join(ROOT, '.local/r2/posts');

/** パレット（hex 小文字） + 受容色（white/none 等） */
const PALETTE = new Map([
  // Ink
  ['#222222', 'ink-strong'],
  ['#222', 'ink-strong'],
  ['#555555', 'ink-body'],
  ['#555', 'ink-body'],
  ['#8a8a8a', 'ink-muted'],
  ['#d7d7d7', 'token-border'],
  ['#f5f5f5', 'surface'],
  // Brand
  ['#2e6da4', 'brand'],
  ['#e8f0fe', 'brand-fill'],
  ['#1a3a5c', 'brand-deep'],
  // Positive
  ['#3a7d44', 'positive'],
  ['#d0e8d0', 'positive-fill'],
  // Warn
  ['#d4a017', 'warn'],
  ['#fff3cd', 'warn-fill'],
  // Danger
  ['#b22234', 'danger'],
  ['#f8d7da', 'danger-fill'],
]);

/** 受容（パレット外でも許容） */
const NEUTRALS = new Set(['white', '#fff', '#ffffff', 'black', '#000', '#000000', 'none', 'transparent', 'currentcolor']);

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const TOP = (() => {
  const t = args.find(a => a.startsWith('--top='));
  return t ? parseInt(t.split('=')[1], 10) : null;
})();

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.svg')) out.push(p);
  }
  return out;
}

/** SVG 内の色を全部抜く（fill=, stroke=, stop-color=, style 中のも） */
function extractColors(svg) {
  const colors = [];
  // attribute 形式: fill="..."/stroke="..."/stop-color="..."
  const attrRe = /\b(?:fill|stroke|stop-color)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(svg))) colors.push(m[1].trim());
  // style="fill:xxx;stroke:yyy"
  const styleRe = /style\s*=\s*"([^"]*)"/g;
  while ((m = styleRe.exec(svg))) {
    const s = m[1];
    const sub = /(?:fill|stroke|stop-color)\s*:\s*([^;"]+)/g;
    let n;
    while ((n = sub.exec(s))) colors.push(n[1].trim());
  }
  return colors;
}

function normalize(c) {
  const s = c.toLowerCase().trim();
  if (s.startsWith('#')) {
    // 3-char shorthand → 6-char
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  return s;
}

function isAccepted(c) {
  const n = normalize(c);
  return PALETTE.has(n) || PALETTE.has(c.toLowerCase()) || NEUTRALS.has(n);
}

function main() {
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）: 走査不成立は緑ではなく exit 1。
  if (!existsSync(TARGET_DIR)) {
    console.error(`audit-svg-colors: FAIL — 走査対象ディレクトリが存在しない: ${TARGET_DIR}`);
    process.exit(1);
  }
  const files = walk(TARGET_DIR);
  if (files.length === 0) {
    console.error(`audit-svg-colors: FAIL — SVG を 1 枚も検査していない（走査対象: ${TARGET_DIR}）`);
    process.exit(1);
  }
  const report = [];
  const globalOutOfPalette = new Map();

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const colors = extractColors(content);
    if (colors.length === 0) continue;

    const accepted = [];
    const rejected = new Map();
    for (const c of colors) {
      if (isAccepted(c)) accepted.push(c);
      else {
        const k = normalize(c);
        rejected.set(k, (rejected.get(k) || 0) + 1);
        globalOutOfPalette.set(k, (globalOutOfPalette.get(k) || 0) + 1);
      }
    }
    const total = colors.length;
    const ok = accepted.length;
    const pct = total > 0 ? Math.round((ok / total) * 1000) / 10 : 100;
    report.push({
      file: relative(ROOT, file),
      total,
      ok,
      pct,
      rejected: [...rejected.entries()].sort((a, b) => b[1] - a[1]),
    });
  }

  // 昇順（適合率の低い順）
  report.sort((a, b) => a.pct - b.pct);

  const compliant = report.filter(r => r.pct === 100).length;
  const almost = report.filter(r => r.pct >= 80 && r.pct < 100).length;
  const partial = report.filter(r => r.pct >= 50 && r.pct < 80).length;
  const bad = report.filter(r => r.pct < 50).length;

  console.log('');
  console.log('='.repeat(70));
  console.log(` SVG カラー監査レポート（走査 ${files.length} 枚 / 色定義あり ${report.length} 枚）`);
  console.log('='.repeat(70));
  console.log(`  100%  適合:  ${compliant} 枚`);
  console.log(`  80-99%  :    ${almost} 枚（軽微な修正で済む）`);
  console.log(`  50-79%  :    ${partial} 枚（中程度の書き換え）`);
  console.log(`  <50%    :    ${bad} 枚（大幅な書き換えが必要）`);
  console.log('');

  console.log('--- 最もズレているファイル top ' + (TOP ?? 15) + ' ---');
  for (const r of report.slice(0, TOP ?? 15)) {
    if (r.pct === 100) break;
    console.log(`  ${r.pct.toString().padStart(5)}%  (${r.ok}/${r.total})  ${r.file}`);
    if (VERBOSE && r.rejected.length > 0) {
      const top = r.rejected.slice(0, 5);
      const tail = top.map(([c, n]) => `${c}×${n}`).join(' ');
      console.log(`          非パレット: ${tail}`);
    }
  }

  console.log('');
  console.log('--- グローバル: パレット外で最も多い色 top 15 ---');
  const sortedOut = [...globalOutOfPalette.entries()].sort((a, b) => b[1] - a[1]);
  for (const [c, n] of sortedOut.slice(0, 15)) {
    console.log(`  ${c.padEnd(10)} × ${n}`);
  }

  console.log('');
  console.log('非パレット色ユニーク数:', globalOutOfPalette.size);
  console.log('');
}

main();
