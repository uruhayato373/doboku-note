#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, '.local', 'r2', 'posts');

const dryRun = process.argv.includes('--dry-run');

console.log(`\n📝 Frontmatter フィールドを追加中`);
console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}\n`);

const results = { updated: 0, skipped: 0, errors: 0 };

/**
 * Determine category from file path
 * E.g., .local/r2/posts/civil-construction-1/guide/strategy.mdx → civil-construction-1
 */
function getCategoryFromPath(filePath) {
  const relative = path.relative(postsDir, filePath);
  const parts = relative.split(path.sep);
  return parts[0]; // First directory is the category
}

/**
 * Determine tags from file path
 * E.g., civil-construction-1/guide/strategy.mdx → ['guide']
 *       civil-construction-1/primary/h26-a.mdx → ['primary', 'past-questions']
 */
function getTagsFromPath(filePath) {
  const relative = path.relative(postsDir, filePath);
  const parts = relative.split(path.sep);
  const tags = [];

  // Add directory name as tag (e.g., 'guide', 'primary', 'secondary')
  if (parts[1] && parts[1] !== 'article.mdx') {
    tags.push(parts[1]);

    // Add additional tags based on directory structure
    if (parts[1] === 'primary') {
      tags.push('past-questions');
    } else if (parts[1] === 'secondary') {
      tags.push('exam-questions');
    } else if (parts[1] === 'guide') {
      tags.push('guide', 'exam-preparation');
    }

    // Add nested subdirectory as tag (e.g., concrete, earthwork)
    if (parts[2] && parts[2] !== 'article.mdx' && !parts[2].endsWith('.mdx')) {
      tags.push(parts[2]);
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Process all .mdx files in directory recursively
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      try {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const matterResult = matter(fileContents);
        const data = matterResult.data;

        // Check if fields are missing
        const needsUpdate =
          !data.category || !data.tags || data.published === undefined;

        if (!needsUpdate) {
          results.skipped++;
          continue;
        }

        // Determine category and tags
        const category = data.category || getCategoryFromPath(fullPath);
        const tags = data.tags || getTagsFromPath(fullPath);
        const published = data.published !== undefined ? data.published : true;

        // Update frontmatter
        const updatedData = {
          ...data,
          category,
          tags,
          published,
        };

        const updatedContent = matter.stringify(
          matterResult.content,
          updatedData
        );

        if (dryRun) {
          const relative = path.relative(postsDir, fullPath);
          console.log(`✅ [DRY-RUN] ${relative}`);
          console.log(`   category: ${category}, tags: ${tags.join(', ')}`);
        } else {
          fs.writeFileSync(fullPath, updatedContent, 'utf8');
          const relative = path.relative(postsDir, fullPath);
          console.log(`✅ ${relative}`);
        }

        results.updated++;
      } catch (err) {
        const relative = path.relative(postsDir, fullPath);
        console.error(`❌ エラー: ${relative} - ${err.message}`);
        results.errors++;
      }
    }
  }
}

processDirectory(postsDir);

// Summary
console.log('\n' + '='.repeat(60));
console.log(`更新: ${results.updated}`);
console.log(`スキップ: ${results.skipped}`);
console.log(`エラー: ${results.errors}`);
console.log('='.repeat(60) + '\n');

if (dryRun) {
  console.log('✨ DRY RUN 完了。ファイルは更新されていません。');
  console.log('   実行するには --dry-run なしで実行してください。\n');
} else {
  console.log('✨ Frontmatter 更新完了！\n');
}
