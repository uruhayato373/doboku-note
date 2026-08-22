#!/usr/bin/env node
/**
 * Doc Meta Index Builder
 *
 * 全 MDX の frontmatter を走査し、静的メタデータインデックスを
 * src/config/doc-meta-index.json に出力する。
 *
 * ランタイムの getDocMeta() / getDocsMetaByCategory() はこの JSON を
 * 直接 import して使用する（ファイル I/O ゼロ）。
 *
 * Usage:
 *   node .claude/scripts/build-doc-meta-index.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import matter from 'gray-matter';
import { loadGitDates, lookupGitDates } from './lib/git-dates.mjs';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const OUT_PATH = join(ROOT, 'src/config/doc-meta-index.json');

// ── MDX 列挙 ────────────────────────────────────────────────────

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMdx(p));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') {
      out.push(p);
    }
  }
  return out;
}

// ── slug 生成 ──────────────────────────────────────────────────
// Convention A: `content/site/<cat>/dir/file.mdx` → `<cat>-dir-file`
// Convention B: `content/site/<cat>/dir/article.mdx` → `<cat>-dir`

function toSlug(filePath) {
  const rel = relative(POSTS_ROOT, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  const parts = withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article');
  return parts.join('-');
}

// ── メイン処理 ─────────────────────────────────────────────────

function main() {
  const files = walkMdx(POSTS_ROOT);
  console.log(`[doc-meta] ${files.length} MDX を走査`);

  // git log 全体走査で created / dateModified を上書き（frontmatter の値より優先）
  const gitDates = loadGitDates();
  console.log(`[doc-meta] git-dates: ${gitDates.size} ファイルを解析`);

  const docs = {};
  const byCategory = {};
  let unpublished = 0;

  for (const filePath of files) {
    let parsed;
    try {
      const raw = readFileSync(filePath, 'utf8');
      parsed = matter(raw);
    } catch (e) {
      console.error(`[doc-meta] skip (parse error): ${filePath} ${e.message}`);
      continue;
    }

    const data = parsed.data || {};

    // published: false は除外
    if (data.published === false) {
      unpublished++;
      continue;
    }

    const slug = toSlug(filePath);

    // frontmatter を正規化して格納（slug はキーなので含めない）
    const meta = {
      title: data.title || '',
      description: data.description || '',
      ...data,
      published: data.published !== false,
    };

    // Date オブジェクトを ISO 文字列に変換（JSON シリアライズ対応）
    for (const [key, value] of Object.entries(meta)) {
      if (value instanceof Date) {
        meta[key] = value.toISOString();
      }
    }

    // git log 由来の created / dateModified で上書き（frontmatter が古くなっても追随する）
    const relPath = relative(ROOT, filePath);
    const gd = lookupGitDates(gitDates, relPath);
    if (gd) {
      meta.created = gd.created;
      meta.dateModified = gd.dateModified;
    }

    docs[slug] = meta;

    // カテゴリ別カウント
    const cat = data.category || '_uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const published = Object.keys(docs).length;

  // slug 順でソート（決定論的出力）
  const sorted = {};
  for (const key of Object.keys(docs).sort()) {
    sorted[key] = docs[key];
  }

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      total: files.length,
      published,
      unpublished,
      by_category: byCategory,
    },
    docs: sorted,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`[doc-meta] ✓ ${relative(ROOT, OUT_PATH)} に出力`);
  console.log(`  published: ${published}`);
  console.log(`  unpublished (skipped): ${unpublished}`);
  for (const [cat, count] of Object.entries(byCategory).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

main();
