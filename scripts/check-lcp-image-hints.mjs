#!/usr/bin/env node
// 本文フォールド内の1枚目図版に「遅延読込を付けない」ゲート。
//
// ルール（真実源: .claude/knowledge/reference/measurement-incidents.md「lab と field の判定原則」）:
//   本文先頭 MAX_OFFSET 文字以内にある最初の <img> は、モバイル(390x844)のフォールド内に
//   入り LCP 要素になる。この 1 枚に loading="lazy" が付いていると、低速回線では取得が
//   レイアウト確定まで遅延し LCP が数秒伸びる。よって
//     loading="eager" かつ fetchpriority="high" を必須とする。
//   2 枚目以降・フォールド外（offset 超過）の画像は従来どおり lazy が正しい。
//
// 背景: 2026-07-27 の EXP-005 診断で、civil-construction-1-primary-r07-a の LCP 要素が
//   本文1枚目の図版（top 617px < viewport 844px）でありながら loading="lazy" だったことを
//   Playwright + PerformanceObserver で実測。PSI lab の LCP 5-7s の主因だった
//   （実ユーザー CrUX は高速回線のため p75 822ms=FAST で顕在化せず、lab/field が乖離していた）。
//   MDX のリテラル JSX <img> は components マップを経由しない（markdown 記法 ![]() のみ経由）ため
//   src/lib/component-loader では強制できず、MDX ソース側を守る必要がある。
//
// 使い方:
//   node scripts/check-lcp-image-hints.mjs            # 全記事を検査（CI 用）
//   node scripts/check-lcp-image-hints.mjs --staged   # git staged の MDX のみ（pre-commit 用）
//   node scripts/check-lcp-image-hints.mjs --fix      # 違反を自動修正（loading/fetchpriority を付与）
// 違反が 1 件でもあれば exit 1（--fix は修正後 exit 0）。

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// フォールド内とみなす本文先頭からの文字数。モバイル 844px 相当の経験値。
const MAX_OFFSET = 2000;
const ROOT = '.local/r2/posts';
const STAGED = process.argv.includes('--staged');
const FIX = process.argv.includes('--fix');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.mdx')) out.push(p.split('\\').join('/'));
  }
  return out;
}

// frontmatter を除いた本文と、その開始オフセットを返す。
function splitBody(raw) {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? { body: raw.slice(m[0].length), start: m[0].length } : { body: raw, start: 0 };
}

// フォールド内1枚目の <img> タグを返す。無ければ null。
function findFoldImage(body) {
  const m = body.match(/<img\s[^>]*?src=["']([^"']+)["'][^>]*>/i);
  if (!m || m.index > MAX_OFFSET) return null;
  return { tag: m[0], src: m[1], offset: m.index };
}

function violationOf(tag) {
  const eager = /loading=["']eager["']/i.test(tag);
  const high = /fetchpriority=["']high["']/i.test(tag);
  if (eager && high) return null;
  if (/loading=["']lazy["']/i.test(tag)) return 'loading="lazy"（フォールド内なのに遅延読込）';
  if (!eager) return 'loading="eager" が無い';
  return 'fetchpriority="high" が無い';
}

function fixTag(tag) {
  let out = tag;
  if (/loading=["'][^"']*["']/i.test(out)) {
    out = out.replace(/loading=["'][^"']*["']/i, 'loading="eager"');
  } else {
    out = out.replace(/(<img\s)/i, '$1loading="eager" ');
  }
  if (!/fetchpriority=/i.test(out)) {
    out = out.replace(/loading=["']eager["']/i, 'loading="eager" fetchpriority="high"');
  } else {
    out = out.replace(/fetchpriority=["'][^"']*["']/i, 'fetchpriority="high"');
  }
  return out;
}

let files;
if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    staged = [];
  }
  files = staged.filter((f) => f.startsWith(`${ROOT}/`) && f.endsWith('.mdx') && existsSync(f));
} else {
  files = walk(ROOT);
}

const fails = [];
let checked = 0;
let fixed = 0;

for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const { body, start } = splitBody(raw);
  const img = findFoldImage(body);
  if (!img) continue;
  checked++;

  const reason = violationOf(img.tag);
  if (!reason) continue;

  if (FIX) {
    const abs = start + img.offset;
    const next = fixTag(img.tag);
    writeFileSync(f, raw.slice(0, abs) + next + raw.slice(abs + img.tag.length), 'utf8');
    fixed++;
    continue;
  }
  fails.push({ f, reason, src: img.src.split('/').pop(), offset: img.offset });
}

if (FIX) {
  console.log(`[check-lcp-image-hints] ✓ ${fixed} 件を修正（検査 ${checked} 件）`);
  process.exit(0);
}

if (fails.length === 0) {
  const scope = STAGED ? 'staged ' : '';
  console.log(`[check-lcp-image-hints] ✓ ${scope}フォールド内1枚目の図版 ${checked} 件は全て eager+fetchpriority=high`);
  process.exit(0);
}

console.error(`[check-lcp-image-hints] ✗ ${fails.length} 件のフォールド内1枚目の図版が LCP を遅延させます`);
console.error(`  真実源: .claude/knowledge/reference/measurement-incidents.md「lab と field の判定原則」`);
for (const r of fails) {
  console.error(`  ${r.f}`);
  console.error(`    ${r.src}（本文 ${r.offset} 文字目）: ${r.reason}`);
}
console.error(`  → loading="eager" fetchpriority="high" を付けてください（自動修正: npm run check-lcp-image-hints -- --fix）`);
process.exit(1);
