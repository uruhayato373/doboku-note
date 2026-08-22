#!/usr/bin/env node
/**
 * check-kindle-epub-leak.mjs — 配布 EPUB に「原稿の素」が漏れていないか検査する
 * ---------------------------------------------------------------------------
 * なぜ要るか（2026-08-12 実際に発生）:
 *   scripts/kindle-dist/ の 3 冊（e-02 / g-01 / g-02）で、章タイトルが `article.mdx` のまま出力され、
 *   本文冒頭に YAML frontmatter（title:/seoTitle:/tags: …）がそのまま印字されていた。
 *   e-02 は **その状態で Amazon の審査に出ていた**（status: in_review）。
 *
 *   真因は**ソース MDX の BOM**。先頭に U+FEFF があると frontmatter の `^---` が外れ、
 *   ビルダは title を拾えずファイル名へフォールバックし、frontmatter を本文として流し込む。
 *   BOM は目視できず、`file` コマンドでしか気づけないため、機械で止める必要がある。
 *
 * 検査:
 *   1. dist の全 EPUB を展開し、OEBPS/*.xhtml に `article.mdx` / `seoTitle:` が出ないこと
 *   2. ソース MDX（content/site/**）に BOM が無いこと（上流での再発を止める）
 *   検査対象が 0 件なら「検査不成立」として exit 1（緑と区別する）
 *
 * 使い方:
 *   node scripts/check-kindle-epub-leak.mjs            # EPUB + ソース BOM
 *   node scripts/check-kindle-epub-leak.mjs --bom-only # BOM だけ（pre-commit 用・展開しないので速い）
 * exit: 0=健全 / 1=漏れ or BOM or 検査不成立
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const BOM_ONLY = process.argv.includes('--bom-only');
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const LEAKS = [
  { re: /article\.mdx/, why: '章タイトルがソースのファイル名のまま（frontmatter の title を拾えていない）' },
  { re: /seoTitle:/, why: 'YAML frontmatter が本文として印字されている' },
];

const errors = [];

// --- 1. ソース MDX の BOM ---
const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
};
const mdx = walk('content/site');
if (mdx.length === 0) errors.push('MDX 走査が 0 件（検査不成立）');
const bom = mdx.filter((f) => readFileSync(f).subarray(0, 3).equals(BOM));
for (const f of bom) errors.push(`BOM 付き MDX（frontmatter が壊れる）: ${f}`);
console.log(`[check-kindle-epub-leak] MDX ${mdx.length} 件を実検査 / BOM ${bom.length} 件`);

// --- 2. 配布 EPUB の漏れ ---
if (!BOM_ONLY) {
  const dist = 'scripts/kindle-dist';
  const epubs = existsSync(dist) ? readdirSync(dist).filter((f) => f.endsWith('.epub')) : [];
  if (epubs.length === 0) errors.push('EPUB 走査が 0 件（検査不成立）');
  let scanned = 0;
  for (const name of epubs) {
    const tmp = mkdtempSync(join(tmpdir(), 'epubleak-'));
    try {
      execFileSync('unzip', ['-qo', join(dist, name), '-d', tmp], { stdio: 'ignore' });
      const oebps = join(tmp, 'OEBPS');
      if (!existsSync(oebps)) { errors.push(`${name}: OEBPS が無い`); continue; }
      const pages = readdirSync(oebps).filter((f) => f.endsWith('.xhtml'));
      if (pages.length === 0) { errors.push(`${name}: xhtml が 0 件（検査不成立）`); continue; }
      scanned++;
      for (const p of pages) {
        const html = readFileSync(join(oebps, p), 'utf8');
        for (const { re, why } of LEAKS) {
          if (re.test(html)) errors.push(`${name}/${p}: ${why}`);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(`[check-kindle-epub-leak] EPUB ${scanned}/${epubs.length} 冊を実検査`);
}

if (errors.length) {
  console.error('[check-kindle-epub-leak] NG');
  for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
  if (errors.length > 40) console.error(`- ほか ${errors.length - 40} 件`);
  console.error('  修正: BOM を除去 → 該当 spec を再ビルド → node scripts/sync-kindle-dist.mjs <id>');
  process.exit(1);
}
console.log('[check-kindle-epub-leak] ✓ 原稿の素の漏れ・BOM ともに無し');
