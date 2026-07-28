#!/usr/bin/env node
// 転職・キャリア記事（frontmatter `tags: [career]`）が「学習系の一覧」に混ざらないことを守るゲート。
//
// なぜ必要か: career 記事は `group: guide` + `tags: [career]` で書かれるため、
// `classifyDoc()` は career も 'guide' として返す。学習系の一覧を素朴に
// `classifyDoc(m) === 'guide'` で組むと転職記事が混入する。実際 2026-07-28 に
// docs サイドバー「試験ガイド」で発生した（civil-1 は 49 件中 26 件が転職記事、
// civil-2 は 22 件中 10 件）。判定の直書きが 8 箇所に散っていたのが再発の温床。
//
// 検査は 2 層:
//   [source]（既定・pre-commit 向け・ビルド不要）
//     - HARD FAIL: HIGH_INTENT_CAREER_SLUGS に career タグでない slug がある
//     - HARD FAIL: careerFeatured に career タグでない slug がある
//     - HARD FAIL: career タグなのに group が guide でない（分類の前提崩れ）
//     - WARN: career タグなのに HIGH_INTENT_CAREER_SLUGS 未収録（アフィリ面の取りこぼし）
//   [built]（--built・CI 向け・`npm run build` 後）
//     - HARD FAIL: out/docs/**.html の <ul data-nav-list="exam-guide"> 内に career slug へのリンク
//
// 真実源: frontmatter `tags: [career]`（唯一の実データ）。述語は src/lib/doc-classifier.ts の isCareerDoc。
// 関連ゲート: check-category-curriculum.mjs（curriculum config の整合。守備範囲が別）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = process.argv.includes('--built');

const errors = [];
const warnings = [];

// ---- career slug 集合（真実源 = doc-meta-index の tags）------------------------
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/doc-meta-index.json'), 'utf8'));
const docs = index.docs; // { fullSlug: { category, group, tags, ... } }

const careerSlugs = new Set();
for (const [slug, m] of Object.entries(docs)) {
  if ((m.tags || []).includes('career')) careerSlugs.add(slug);
}
if (careerSlugs.size === 0) {
  console.error('[check-career-separation] career タグの記事が 0 件。index が壊れている可能性があります。');
  process.exit(1);
}

if (!BUILT) {
  // ---- 1. HIGH_INTENT_CAREER_SLUGS ⊆ career タグ -----------------------------
  const creativesSrc = fs.readFileSync(path.join(ROOT, 'src/config/affiliate-creatives.ts'), 'utf8');
  const highMatch = creativesSrc.match(/HIGH_INTENT_CAREER_SLUGS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!highMatch) {
    errors.push('affiliate-creatives.ts の HIGH_INTENT_CAREER_SLUGS を読み取れません（定義形が変わった可能性）');
  } else {
    const high = [...highMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    for (const slug of high) {
      if (!careerSlugs.has(slug)) {
        errors.push(`HIGH_INTENT_CAREER_SLUGS の "${slug}" は career タグを持ちません（記事側の tags か リストを直す）`);
      }
    }
    const missing = [...careerSlugs].filter((s) => !high.includes(s));
    if (missing.length > 0) {
      warnings.push(`career タグだが HIGH_INTENT_CAREER_SLUGS 未収録 ${missing.length} 件: ${missing.join(', ')}`);
    }
  }

  // ---- 2. careerFeatured ⊆ career タグ ---------------------------------------
  const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/config/category-curriculum.json'), 'utf8'));
  for (const [category, cfg] of Object.entries(curriculum)) {
    if (category.startsWith('$')) continue;
    for (const suffix of cfg.careerFeatured ?? []) {
      const full = `${category}-${suffix}`;
      if (!careerSlugs.has(full)) {
        errors.push(`careerFeatured の "${full}" は career タグを持ちません（${category}）`);
      }
    }
  }

  // ---- 3. career タグの記事は group: guide である（分類の前提）-----------------
  for (const slug of careerSlugs) {
    const g = docs[slug]?.group;
    if (g && g !== 'guide') {
      errors.push(`"${slug}" は career タグだが group="${g}"（career は group: guide 前提。分類が壊れます）`);
    }
  }
} else {
  // ---- 4. ビルド後: 学習系ナビ一覧に career リンクが無い ----------------------
  const outDir = path.join(ROOT, 'out/docs');
  if (!fs.existsSync(outDir)) {
    console.error('[check-career-separation] out/docs がありません。先に `npm run build` を実行してください。');
    process.exit(1);
  }
  const htmlFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) htmlFiles.push(p);
    }
  };
  walk(outDir);

  let listsFound = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    // data-nav-list="exam-guide" の <ul>…</ul> を取り出して中のリンクを検査する
    const lists = html.matchAll(/<ul[^>]*data-nav-list="exam-guide"[^>]*>([\s\S]*?)<\/ul>/g);
    for (const m of lists) {
      listsFound++;
      const hrefs = [...m[1].matchAll(/href="\/docs\/([^"]+?)\/?"/g)].map((x) => x[1]);
      const mixed = hrefs.filter((s) => careerSlugs.has(s));
      if (mixed.length > 0) {
        errors.push(`${path.relative(ROOT, file)}: 学習系ナビに career 記事 ${mixed.length} 件が混入 → ${mixed.join(', ')}`);
      }
    }
  }
  if (listsFound === 0) {
    warnings.push('exam-guide ナビ一覧が 1 件も見つかりません（data-nav-list マーカーが外れた可能性）');
  } else {
    console.log(`[check-career-separation] 検査した学習系ナビ一覧: ${listsFound} 箇所（${htmlFiles.length} HTML）`);
  }
}

// ---- 出力 --------------------------------------------------------------------
for (const w of warnings) console.log(`[check-career-separation] WARN ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`[check-career-separation] ERROR ${e}`);
  console.error(`[check-career-separation] ✗ ${errors.length} 件のエラー`);
  process.exit(1);
}
console.log(
  `[check-career-separation] ✓ career ${careerSlugs.size} 件の分離は健全（${BUILT ? 'built' : 'source'}・WARN ${warnings.length}）`,
);
