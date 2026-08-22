#!/usr/bin/env node
/**
 * title → title + seoTitle マイグレーション
 *
 * 全 MDX の frontmatter を変換:
 *   - title: 表示用の概念名のみ（クリーン）
 *   - seoTitle: <title> タグに出力する完全な SEO タイトル
 *
 * 変換ルール:
 *   1. title に「｜」を含む → seoTitle = 現title, title = ｜より前をtrim
 *   2. PE-CM 過去問（択一式タグ） → seoTitle = title +【解答解説付き】
 *   3. PE-CM 過去問（その他） → seoTitle = title
 *   4. それ以外 → seoTitle = title + " | doboku-note"
 *
 * Usage:
 *   node .claude/scripts/migrate-title-seo.mjs [--dry-run]
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import matter from 'gray-matter';
import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site');
const DRY_RUN = process.argv.includes('--dry-run');

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

// ── seoTitle 生成ルール ──────────────────────────────────────────

function computeSeoTitle(data) {
  const title = data.title || '';
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const group = data.group || '';

  // ルール1: title に「｜」を含む → 現タイトルがそのまま seoTitle
  if (title.includes('｜')) {
    return title;
  }

  // ルール2: PE-CM 過去問（択一式）
  if (group === 'past-exam' && tags.includes('択一式')) {
    return `${title}【解答解説付き】`;
  }

  // ルール3: PE-CM 過去問（記述式等）
  if (group === 'past-exam') {
    return title;
  }

  // ルール4: それ以外
  return `${title} | doboku-note`;
}

function computeCleanTitle(data) {
  const title = data.title || '';

  // 「｜」を含む → ｜より前を trim
  if (title.includes('｜')) {
    return title.split('｜')[0].trim();
  }

  return title;
}

// ── メイン処理 ─────────────────────────────────────────────────

function main() {
  const files = walkMdx(POSTS_ROOT);
  console.log(`[migrate-title] ${files.length} MDX を走査${DRY_RUN ? '（dry-run）' : ''}`);

  let modified = 0;
  let skipped = 0;
  let alreadyHas = 0;
  const errors = [];

  for (const filePath of files) {
    let parsed;
    try {
      const { raw, eol } = readMdxFile(filePath);
      parsed = matter(raw);

      const data = parsed.data;

      // 既に seoTitle がある場合はスキップ
      if (data.seoTitle) {
        alreadyHas++;
        continue;
      }

      const cleanTitle = computeCleanTitle(data);
      const seoTitle = computeSeoTitle(data);

      // title が変わらず seoTitle も title と同じなら実質変更なし
      if (cleanTitle === data.title && seoTitle === data.title) {
        // それでも seoTitle フィールドは追加する
      }

      // frontmatter を更新
      data.title = cleanTitle;
      data.seoTitle = seoTitle;

      if (!DRY_RUN) {
        // gray-matter の stringify を使って再構築
        const newRaw = matter.stringify(parsed.content, data);
        writeMdxFile(filePath, newRaw, eol);
      }

      modified++;
    } catch (e) {
      errors.push(`${filePath}: ${e.message}`);
    }
  }

  console.log(`[migrate-title] ✓ 完了`);
  console.log(`  modified: ${modified}`);
  console.log(`  already has seoTitle: ${alreadyHas}`);
  console.log(`  errors: ${errors.length}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`  ERROR: ${e}`);
  }
}

main();
