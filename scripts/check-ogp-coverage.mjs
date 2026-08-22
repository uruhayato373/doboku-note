#!/usr/bin/env node
/**
 * check-ogp-coverage.mjs
 *
 * `published: true` のサイト記事（`content/site/**`）すべてに OGP 画像（`ogp.png`）が
 * 生成されているかを検査する。1 件でも欠落していれば exit 1（CI を赤くする）。
 *
 * 背景（2026-06-12 OGP 404 incident, .claude/knowledge/reference/measurement-incidents.md）:
 *   OGP 画像は `npm run ogp`（ogp-create）で手動生成する。新規カテゴリで未実行だと 0 枚のまま
 *   `og:image` が R2 で 404 になり、note / X / Facebook 等の外部リンクカードが生成されない。
 *   `r2-audit`（diff-r2）は「local にあるが R2 に無い」しか検知できず「そもそも未生成」は素通り
 *   するため、この能動チェックで未生成を捕捉する。
 *
 * OGP パス解決は src/lib/r2-image-loader.ts の getOgpImageUrl / ogp-create.mjs の
 * resolveOutputPath と同一ロジック（categories.json の category プレフィックス剥がし）。
 * 変則レイアウト（例: pe-construction-guide-required-essay/article.mdx → category=pe-construction）
 * も slug 解決で正しく `pe-construction/guide-required-essay/ogp.png` を指す。
 *
 * Usage: node scripts/check-ogp-coverage.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const root = process.cwd();
const POSTS_DIR = SITE_CONTENT_ROOT;
const categories = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'config', 'categories.json'), 'utf8'),
);
const asJson = process.argv.includes('--json');

function findMdx(dir, parts = []) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'img' || e.name === '.DS_Store') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findMdx(full, [...parts, e.name]));
    else if (e.name.endsWith('.mdx')) out.push({ full, parts, file: e.name });
  }
  return out;
}

// ogp-create.mjs の buildFullSlug と同一（article.mdx は dir 名を slug 化）。
function buildFullSlug(parts, file) {
  const base = file.replace(/\.mdx$/, '');
  return base === 'article' ? parts.join('-') : [...parts, base].join('-');
}

// getOgpImageUrl / resolveOutputPath と同一の slug→ogp.png ローカルパス解決。
function resolveOgpPath(fullSlug) {
  const cat = categories.find((c) => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) return null; // categories.json 未登録
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  // 単一記事カテゴリ（fullSlug === cat.slug）は localSlug 空 → 記事ディレクトリ直下。
  return localSlug
    ? path.join(POSTS_DIR, cat.slug, localSlug, 'ogp.png')
    : path.join(POSTS_DIR, cat.slug, 'ogp.png');
}

function isPublished(file) {
  const head = fs.readFileSync(file, 'utf8').slice(0, 3000);
  const m = head.match(/^published:\s*(\S+)/m);
  return Boolean(m) && m[1].replace(/["']/g, '').toLowerCase() === 'true';
}

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`[check-ogp-coverage] posts dir 不在: ${POSTS_DIR}`);
  process.exit(2);
}

const mdxFiles = findMdx(POSTS_DIR);
const missing = [];
const unknownCat = [];
let checked = 0;

for (const f of mdxFiles) {
  if (!isPublished(f.full)) continue;
  checked++;
  const slug = buildFullSlug(f.parts, f.file);
  const ogp = resolveOgpPath(slug);
  if (!ogp) {
    unknownCat.push(slug);
    continue;
  }
  if (!fs.existsSync(ogp)) missing.push({ slug, ogp: path.relative(root, ogp).split(path.sep).join('/') });
}

if (asJson) {
  console.log(JSON.stringify({ checked, missing, unknownCat }, null, 2));
} else {
  console.log(`[check-ogp-coverage] published:true ${checked} 件を検査`);
  if (unknownCat.length) {
    console.log(`  警告: categories.json 未登録で OGP 解決不可 ${unknownCat.length} 件:`);
    unknownCat.forEach((s) => console.log(`    - ${s}`));
  }
}

if (missing.length) {
  if (!asJson) {
    console.error(`\n[NG] OGP 画像が欠落している published 記事: ${missing.length} 件`);
    missing.forEach((m) => console.error(`  - ${m.slug}  ->  ${m.ogp}`));
    console.error(
      '\n対応: npm run ogp -- --all で生成し ogp.png を commit（main push で r2-sync が R2 同期）。',
    );
    console.error('詳細: .claude/knowledge/reference/measurement-incidents.md「2026-06-12 OGP 404」');
  }
  process.exit(1);
}

if (!asJson) console.log('[OK] すべての published 記事に OGP 画像あり');
