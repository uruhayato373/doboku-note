#!/usr/bin/env node

/**
 * 内部リンク切れチェッカー
 * 全MDXファイル内の /docs/ リンクを検出し、対応するスラッグが存在するか検証する。
 *
 * Usage: node scripts/check-links.mjs
 */

import fs from 'fs';
import path from 'path';

const postsDir = path.join(process.cwd(), '.local', 'r2', 'posts');

// Step 1: 全MDXファイルからスラッグを収集
function findMdxFiles(dir, basePath = []) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fileName = entry.name.replace(/\.mdx$/, '');

    if (entry.isDirectory()) {
      if (fileName === 'img') continue; // skip image dirs
      results.push(...findMdxFiles(fullPath, [...basePath, fileName]));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      const slugPath = fileName === 'article' ? basePath : [...basePath, fileName];
      if (slugPath.length > 0) {
        results.push({
          slug: slugPath.join('-'),
          filePath: fullPath,
          relativePath: [...basePath, entry.name].join('/'),
        });
      }
    }
  }
  return results;
}

// Step 2: 全MDXファイルから内部リンクを抽出
function extractInternalLinks(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const links = [];
  // Markdown links: [text](/docs/slug) or [text](/category/slug)
  const linkPattern = /\[([^\]]*)\]\((\/(docs|category|about|privacy|search|blog|contact)[^\s)]*)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    links.push({
      text: match[1],
      href: match[2],
      line: lineNum,
    });
  }
  return links;
}

// Step 3: 静的ページの一覧
const staticPages = new Set(['/', '/about', '/privacy', '/search']);

// メイン処理
const allFiles = findMdxFiles(postsDir);
const validSlugs = new Set(allFiles.map(f => f.slug));

// カテゴリページ
const categoriesPath = path.join(process.cwd(), 'src', 'config', 'categories.json');
const validCategories = new Set();
if (fs.existsSync(categoriesPath)) {
  const cats = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
  for (const cat of cats) {
    validCategories.add(cat.slug);
  }
}

let brokenCount = 0;
let checkedCount = 0;
const brokenLinks = [];

for (const file of allFiles) {
  const links = extractInternalLinks(file.filePath);
  for (const link of links) {
    checkedCount++;
    const href = link.href;

    // /docs/{slug} チェック
    if (href.startsWith('/docs/')) {
      const slug = href.replace('/docs/', '').replace(/#.*$/, ''); // remove anchor
      if (!validSlugs.has(slug)) {
        brokenCount++;
        brokenLinks.push({
          file: file.relativePath,
          line: link.line,
          text: link.text,
          href: link.href,
        });
      }
    }
    // /category/{slug} チェック
    else if (href.startsWith('/category/')) {
      const slug = href.replace('/category/', '').replace(/#.*$/, '');
      if (!validCategories.has(slug)) {
        brokenCount++;
        brokenLinks.push({
          file: file.relativePath,
          line: link.line,
          text: link.text,
          href: link.href,
        });
      }
    }
    // 静的ページチェック
    else if (!staticPages.has(href.replace(/#.*$/, ''))) {
      brokenCount++;
      brokenLinks.push({
        file: file.relativePath,
        line: link.line,
        text: link.text,
        href: link.href,
      });
    }
  }
}

// 結果表示
console.log(`\n🔍 内部リンクチェック結果`);
console.log(`   チェック対象: ${allFiles.length} ファイル`);
console.log(`   チェックしたリンク: ${checkedCount} 件`);
console.log(`   有効なスラッグ: ${validSlugs.size} 件\n`);

if (brokenCount === 0) {
  console.log(`✅ リンク切れはありません。\n`);
} else {
  console.log(`❌ リンク切れ: ${brokenCount} 件\n`);

  // ファイルごとにグループ化
  const grouped = {};
  for (const b of brokenLinks) {
    if (!grouped[b.file]) grouped[b.file] = [];
    grouped[b.file].push(b);
  }

  for (const [file, links] of Object.entries(grouped)) {
    console.log(`  📄 ${file}`);
    for (const link of links) {
      console.log(`     L${link.line}: [${link.text}](${link.href})`);
    }
    console.log('');
  }
}

process.exit(brokenCount > 0 ? 1 : 0);
